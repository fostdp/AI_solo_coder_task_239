import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { circlesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CircleCard = ({ circle, onClick }) => {
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => onClick(circle.id)}>
      <div className="card-avatar" style={{ height: '80px', fontSize: '2rem' }}>
        👥
      </div>
      <div className="card-content">
        <h3 className="card-name">{circle.name}</h3>
        {circle.industry && (
          <span className="card-tag">{circle.industry}</span>
        )}
        {circle.is_private === 1 && (
          <span className="card-tag" style={{ background: '#6c757d' }}>🔒 私密</span>
        )}
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          {circle.description || '暂无描述'}
        </div>
        <div style={{ color: '#888', fontSize: '0.85rem' }}>
          👥 {circle.member_count || 0} 成员 | 💬 {circle.post_count || 0} 帖子
        </div>
        {circle.is_member && (
          <div className="alert alert-success" style={{ marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }}>
            ✅ 已加入
          </div>
        )}
      </div>
    </div>
  );
};

const Circles = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [circles, setCircles] = useState([]);
  const [myCircles, setMyCircles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    is_private: false
  });
  const [message, setMessage] = useState(null);

  const loadCircles = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
        const response = await circlesAPI.getMyCircles();
        setMyCircles(response.data.circles);
      } else {
        const response = await circlesAPI.getList({ limit: 50 });
        setCircles(response.data.circles);
      }
    } catch (error) {
      console.error('加载圈子失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircles();
  }, [activeTab]);

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    try {
      const response = await circlesAPI.create(formData);
      setMessage({ type: 'success', text: response.data.message });
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        industry: '',
        is_private: false
      });
      loadCircles();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '创建圈子失败' });
    }
  };

  const handleViewCircle = (circleId) => {
    navigate(`/circles/${circleId}`);
  };

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1>行业交流圈子</h1>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + 创建圈子
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
                全部圈子
              </button>
              <button
                className={`nav-link ${activeTab === 'my' ? 'active' : ''}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => setActiveTab('my')}
              >
                我的圈子
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : activeTab === 'my' ? (
            <div>
              {myCircles.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>您还没有加入任何圈子</p>
                </div>
              ) : (
                <div className="alumni-wall">
                  {myCircles.map(circle => (
                    <CircleCard
                      key={circle.id}
                      circle={{ ...circle, is_member: true }}
                      onClick={handleViewCircle}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {circles.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>暂无圈子，快来创建第一个吧！</p>
                </div>
              ) : (
                <div className="alumni-wall">
                  {circles.map(circle => (
                    <CircleCard
                      key={circle.id}
                      circle={circle}
                      onClick={handleViewCircle}
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
              <h3 className="modal-title">创建新圈子</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCircle}>
              <div className="form-group">
                <label className="form-label">圈子名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入圈子名称"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">圈子描述</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请描述圈子内容"
                />
              </div>

              <div className="form-group">
                <label className="form-label">所属行业</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.industry}
                  onChange={e => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="如：互联网、金融、教育等"
                />
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="is_private"
                  checked={formData.is_private}
                  onChange={e => setFormData({ ...formData, is_private: e.target.checked })}
                />
                <label htmlFor="is_private">设为私密圈子（仅成员可见）</label>
              </div>

              <div className="search-actions">
                <button type="submit" className="btn btn-primary">
                  创建圈子
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

export default Circles;
