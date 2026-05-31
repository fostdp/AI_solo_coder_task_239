import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { messagesAPI, alumniAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [alumniList, setAlumniList] = useState([]);
  const [searchAlumni, setSearchAlumni] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const [convResponse, unreadResponse] = await Promise.all([
        messagesAPI.getConversations(),
        messagesAPI.getUnreadCount()
      ]);
      setConversations(convResponse.data.conversations);
      setUnreadCount(unreadResponse.data.unreadCount);
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setLoading(true);
    try {
      const response = await messagesAPI.getConversation(conversation.user_id);
      setMessages(response.data.messages);
      await messagesAPI.markAllRead(conversation.user_id);
      loadConversations();
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await messagesAPI.send(selectedConversation.user_id, newMessage.trim());
      setNewMessage('');
      handleSelectConversation(selectedConversation);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const loadAlumniForMessage = async () => {
    try {
      const response = await alumniAPI.getList({ limit: 100 });
      setAlumniList(response.data.alumni.filter(a => a.id !== user?.id));
    } catch (error) {
      console.error('加载校友列表失败:', error);
    }
  };

  const handleStartConversation = async (alumni) => {
    setShowNewMessageModal(false);
    setSelectedConversation({
      user_id: alumni.id,
      user_name: alumni.name,
      user_email: alumni.email
    });
    setMessages([]);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredAlumni = alumniList.filter(a => 
    a.name.includes(searchAlumni) ||
    (a.company && a.company.includes(searchAlumni)) ||
    (a.city && a.city.includes(searchAlumni))
  );

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1>站内私信 {unreadCount > 0 && <span className="reminder-badge">{unreadCount} 条未读</span>}</h1>
            <button className="btn btn-primary" onClick={() => { setShowNewMessageModal(true); loadAlumniForMessage(); }}>
              + 新消息
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', minHeight: '600px' }}>
            <div style={{ width: '300px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                <h4 style={{ margin: 0 }}>会话列表</h4>
              </div>
              <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                {conversations.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <p>暂无会话</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.user_id}
                      onClick={() => handleSelectConversation(conv)}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        background: selectedConversation?.user_id === conv.user_id ? '#f0f4ff' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <strong>{conv.user_name}</strong>
                        {conv.unread_count > 0 && (
                          <span className="reminder-badge" style={{ fontSize: '0.7rem' }}>{conv.unread_count}</span>
                        )}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message || '暂无消息'}
                      </div>
                      {conv.last_message_time && (
                        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {formatTime(conv.last_message_time)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ flex: 1, background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
              {selectedConversation ? (
                <>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                    <h4 style={{ margin: 0 }}>{selectedConversation.user_name}</h4>
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>{selectedConversation.user_email}</div>
                  </div>

                  <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', minHeight: '400px', background: '#f9fafb' }}>
                    {loading ? (
                      <div className="loading">加载中...</div>
                    ) : messages.length === 0 ? (
                      <div className="empty-state">
                        <p>开始你们的对话吧！</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {messages.map(msg => {
                          const isMine = msg.sender_id === user?.id;
                          return (
                            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                maxWidth: '70%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: isMine ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                                color: isMine ? 'white' : '#333',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}>
                                <div style={{ marginBottom: '0.25rem' }}>{msg.content}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                  {formatTime(msg.created_at)}
                                  {isMine && msg.is_read && ' ✓已读'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, margin: 0 }}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="输入消息..."
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                      发送
                    </button>
                  </form>
                </>
              ) : (
                <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div>
                    <div className="empty-icon">💬</div>
                    <p>选择一个会话开始聊天</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showNewMessageModal && (
        <div className="modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">发送新消息</h3>
              <button className="modal-close" onClick={() => setShowNewMessageModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">搜索校友</label>
              <input
                type="text"
                className="form-input"
                value={searchAlumni}
                onChange={e => setSearchAlumni(e.target.value)}
                placeholder="搜索姓名、公司、城市..."
              />
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
              {filteredAlumni.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <p>未找到校友</p>
                </div>
              ) : (
                filteredAlumni.map(alumni => (
                  <div
                    key={alumni.id}
                    onClick={() => handleStartConversation(alumni)}
                    style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7fa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <strong>{alumni.name}</strong>
                    <div style={{ color: '#666', fontSize: '0.85rem' }}>
                      {alumni.position || ''}
                      {alumni.company && ` @ ${alumni.company}`}
                      {alumni.city && ` | ${alumni.city}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
