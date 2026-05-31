import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});

  const loadEvent = async () => {
    setLoading(true);
    try {
      const response = await eventsAPI.getById(id);
      setEvent(response.data);
      setFormData({
        title: response.data.title,
        description: response.data.description,
        location: response.data.location,
        event_date: response.data.event_date?.replace(' ', 'T').substring(0, 16),
        registration_deadline: response.data.registration_deadline?.replace(' ', 'T').substring(0, 16),
        max_participants: response.data.max_participants
      });
    } catch (error) {
      console.error('加载活动详情失败:', error);
      setMessage({ type: 'error', text: '加载活动详情失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

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

  const handleRegister = async () => {
    try {
      const response = await eventsAPI.register(id);
      setMessage({ type: 'success', text: response.data.message });
      loadEvent();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '报名失败' });
    }
  };

  const handleUnregister = async () => {
    try {
      const response = await eventsAPI.unregister(id);
      setMessage({ type: 'success', text: response.data.message });
      loadEvent();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '取消报名失败' });
    }
  };

  const handleApprove = async () => {
    try {
      const response = await eventsAPI.approve(id);
      setMessage({ type: 'success', text: response.data.message });
      loadEvent();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '审核失败' });
    }
  };

  const handleReject = async () => {
    try {
      const response = await eventsAPI.reject(id);
      setMessage({ type: 'success', text: response.data.message });
      navigate('/events');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '操作失败' });
    }
  };

  const handleDelete = async () => {
    if (window.confirm('确定要删除这个活动吗？')) {
      try {
        await eventsAPI.delete(id);
        navigate('/events');
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.error || '删除失败' });
      }
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await eventsAPI.update(id, {
        ...formData,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
      });
      setMessage({ type: 'success', text: response.data.message });
      setShowEditModal(false);
      loadEvent();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '更新失败' });
    }
  };

  const isOrganizer = event && event.organizer_id === user?.id;
  const canEdit = isAdmin || isOrganizer;

  if (loading) {
    return (
      <div>
        <Navbar />
        <main className="main-content">
          <div className="container">
            <div className="loading">加载中...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <Navbar />
        <main className="main-content">
          <div className="container">
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>活动不存在</p>
              <button className="btn btn-primary" onClick={() => navigate('/events')}>
                返回活动列表
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/events')}>
              ← 返回活动列表
            </button>
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          <div className="profile-details">
            <div className="detail-item" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <h1 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>{event.title}</h1>
                  <div style={{ opacity: 0.9 }}>
                    📍 {event.location || '地点待定'} | 📅 {formatDate(event.event_date)}
                  </div>
                </div>
                <div style={{ fontSize: '4rem' }}>🎉</div>
              </div>
            </div>

            {event.status === 'pending' && (
              <div className="alert alert-warning">
                ⚠️ 此活动正在等待管理员审核
              </div>
            )}
            {event.status === 'rejected' && (
              <div className="alert alert-danger">
                ❌ 此活动已被拒绝
              </div>
            )}

            <div className="detail-item">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', width: '100%' }}>
                <div>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.25rem' }}>活动时间</div>
                  <div style={{ fontSize: '1.1rem' }}>{formatDate(event.event_date)}</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.25rem' }}>报名截止</div>
                  <div style={{ fontSize: '1.1rem' }}>{event.registration_deadline ? formatDate(event.registration_deadline) : '无截止日期'}</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.25rem' }}>活动地点</div>
                  <div style={{ fontSize: '1.1rem' }}>{event.location || '地点待定'}</div>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.25rem' }}>参与人数</div>
                  <div style={{ fontSize: '1.1rem' }}>
                    {event.participant_count || 0} 人
                    {event.max_participants && ` / ${event.max_participants} 人`}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-item">
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>活动描述</div>
              <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {event.description || '暂无描述'}
              </div>
            </div>

            <div className="detail-item">
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>组织者</div>
              <div style={{ fontSize: '1.1rem' }}>{event.organizer_name}</div>
            </div>

            <div className="detail-item">
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {event.status === 'active' && (
                  <>
                    {event.myRegistration ? (
                      <button className="btn btn-secondary" onClick={handleUnregister}>
                        取消报名
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={handleRegister}>
                        立即报名
                      </button>
                    )}
                  </>
                )}

                {canEdit && (
                  <>
                    <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
                      编辑活动
                    </button>
                    {isAdmin && event.status === 'pending' && (
                      <>
                        <button className="btn btn-primary" onClick={handleApprove}>
                          ✅ 通过审核
                        </button>
                        <button className="btn btn-danger" onClick={handleReject}>
                          ❌ 拒绝
                        </button>
                      </>
                    )}
                    <button className="btn btn-danger" onClick={handleDelete}>
                      删除活动
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">编辑活动</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateEvent}>
              <div className="form-group">
                <label className="form-label">活动标题 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动描述</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动地点</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
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
                  min="1"
                />
              </div>

              <div className="search-actions">
                <button type="submit" className="btn btn-primary">
                  保存修改
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
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

export default EventDetail;
