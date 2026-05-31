import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { newsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const News = () => {
  const { isAdmin } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    source: '',
    source_url: '',
    publish_date: ''
  });
  const [message, setMessage] = useState(null);

  const loadNews = async () => {
    setLoading(true);
    try {
      const response = await newsAPI.getList({ limit: 50 });
      setNews(response.data.news);
    } catch (error) {
      console.error('加载新闻失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      const response = await newsAPI.create(formData);
      setMessage({ type: 'success', text: response.data.message });
      setShowCreateModal(false);
      setFormData({
        title: '',
        content: '',
        source: '',
        source_url: '',
        publish_date: ''
      });
      loadNews();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '发布新闻失败' });
    }
  };

  const handleViewNews = async (newsId) => {
    try {
      const response = await newsAPI.getById(newsId);
      setSelectedNews(response.data);
    } catch (error) {
      console.error('加载新闻详情失败:', error);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1>母校新闻</h1>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                + 发布新闻
              </button>
            )}
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          {loading ? (
            <div className="loading">加载中...</div>
          ) : news.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <p>暂无新闻</p>
            </div>
          ) : (
            <div className="profile-details">
              {news.map(item => (
                <div 
                  key={item.id} 
                  className="detail-item" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewNews(item.id)}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>{item.title}</h3>
                    <div style={{ color: '#666', marginBottom: '0.5rem' }}>
                      {item.content?.substring(0, 150)}{item.content?.length > 150 ? '...' : ''}
                    </div>
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>
                      {item.source && <span>📌 {item.source}</span>}
                      <span style={{ marginLeft: '1rem' }}>📅 {formatDate(item.publish_date || item.created_at)}</span>
                      {item.created_by_name && <span style={{ marginLeft: '1rem' }}>✍️ {item.created_by_name}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedNews && (
        <div className="modal-overlay" onClick={() => setSelectedNews(null)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedNews.title}</h3>
              <button className="modal-close" onClick={() => setSelectedNews(null)}>×</button>
            </div>
            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {selectedNews.source && <span>来源: {selectedNews.source}</span>}
              <span style={{ marginLeft: '1rem' }}>📅 {formatDate(selectedNews.publish_date || selectedNews.created_at)}</span>
              {selectedNews.created_by_name && <span style={{ marginLeft: '1rem' }}>✍️ {selectedNews.created_by_name}</span>}
            </div>
            {selectedNews.source_url && (
              <div style={{ marginBottom: '1rem' }}>
                <a href={selectedNews.source_url} target="_blank" rel="noopener noreferrer">
                  🔗 查看原文
                </a>
              </div>
            )}
            <div style={{ lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>
              {selectedNews.content}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">发布新闻</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateNews}>
              <div className="form-group">
                <label className="form-label">新闻标题 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入新闻标题"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">新闻内容 *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '200px' }}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="请输入新闻内容"
                  required
                />
              </div>

              <div className="search-row">
                <div className="form-group">
                  <label className="form-label">来源</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    placeholder="如：校友会、官网等"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">发布日期</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.publish_date}
                    onChange={e => setFormData({ ...formData, publish_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">原文链接</label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.source_url}
                  onChange={e => setFormData({ ...formData, source_url: e.target.value })}
                  placeholder="https://"
                />
              </div>

              <div className="search-actions">
                <button type="submit" className="btn btn-primary">
                  发布新闻
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

export default News;
