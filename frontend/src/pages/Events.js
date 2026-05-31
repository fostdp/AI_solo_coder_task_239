import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EventCard = ({ event, onView, onRegister, onUnregister }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '待定';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="card-tag" style={{ background: '#28a745' }}>进行中</span>;
      case 'pending':
        return <span className="card-tag" style={{ background: '#ffc107', color: '#333' }}>待审核</span>;
      case 'rejected':
        return <span className="card-tag" style={{ background: '#dc3545' }}>已拒绝</span>;
      default:
        return null;
    }
  };

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => onView(event.id)}>
      <div className="card-avatar" style={{ height: '100px', fontSize: '2.5rem' }}>
        🎉
      </div>
      <div className="card-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 className="card-name" style={{ margin: 0 }}>{event.title}</h3>
          {getStatusBadge(event.status)}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          📍 {event.location || '地点待定'}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          📅 {formatDate(event.event_date)}
        </div>
        {event.registration_deadline && (
          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            报名截止: {formatDate(event.registration_deadline)}
          </div>
        )}
        <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          👤 组织者: {event.organizer_name}
        </div>
        {event.max_participants && (
          <div style={{ color: '#888', fontSize: '0.85rem' }}>
            👥 {event.participant_count || 0}/{event.max_participants} 人
          </div>
        )}
        {event.myRegistration && (
          <div className="alert alert-success" style={{ marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }}>
            ✅ 已报名
          </div>
        )}
      </div>
    </div>
  );
};

const Events = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState({ organized: [], registered: [] });
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    registration_deadline: '',
    max_participants: ''
  });
  const [message, setMessage] = useState(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
        const response = await eventsAPI.getMyEvents();
        setMyEvents(response.data);
      } else {
        const response = await eventsAPI.getList({ status: 'active', limit: 50 });
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error('加载活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await eventsAPI.create({
        ...formData,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
      });
      setMessage({ type: 'success', text: response.data.message });
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        location: '',
        event_date: '',
        registration_deadline: '',
        max_participants: ''
      });
      loadEvents();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '创建活动失败' });
    }
  };

  const handleViewEvent = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1>校友活动</h1>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + 发起活动
            </button>
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          <div className="search-filters" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
            <div className="nav-links" style={{ margin: 0, padding: 0 }}>
              <button
                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('all')}
              >
                全部活动
              </button>
              <button
                className={`nav-link ${activeTab === 'my' ? 'active' : ''}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('my')}
              >
                我的活动
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : activeTab === 'my' ? (
            <div>
              {myEvents.organized.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>我发起的 ({myEvents.organized.length})</h3>
                  <div className="alumni-wall">
                    {myEvents.organized.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onView={handleViewEvent}
                      />
                    ))}
                  </div>
                </div>
              )}

              {myEvents.registered.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>我报名的 ({myEvents.registered.length})</h3>
                  <div className="alumni-wall">
                    {myEvents.registered.map(event => (
                      <EventCard
                        key={event.id}
                        event={{ ...event, myRegistration: true }}
                        onView={handleViewEvent}
                      />
                    ))}
                  </div>
                </div>
              )}

              {myEvents.organized.length === 0 && myEvents.registered.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <p>您还没有参与任何活动</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {events.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <p>暂无活动，快来发起第一个活动吧！</p>
                </div>
              ) : (
                <div className="alumni-wall">
                  {events.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onView={handleViewEvent}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">发起新活动</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label className="form-label">活动标题 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入活动标题"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动描述</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请描述活动内容"
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动地点</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="请输入活动地点"
                />
              </div>

              <div className="search-row">
                <div className="form-group">
                  <label className="form-label">活动时间 *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.event_date}
                    onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">报名截止</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.registration_deadline}
                    onChange={e => setFormData({ ...formData, registration_deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">最大参与人数</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.max_participants}
                  onChange={e => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="不限制请留空"
                  min="1"
                />
              </div>

              {!isAdmin && (
                <div className="alert alert-warning">
                  ⚠️ 您发起的活动需要管理员审核后才能发布
                </div>
              )}

              <div className="search-actions">
                <button type="submit" className="btn btn-primary">
                  发起活动
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
