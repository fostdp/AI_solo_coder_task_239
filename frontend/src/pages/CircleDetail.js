import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { circlesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CircleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [circle, setCircle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const postsEndRef = useRef(null);

  const loadCircle = async () => {
    setLoading(true);
    try {
      const response = await circlesAPI.getById(id);
      const data = response.data;
      if (data.circle) {
        setCircle({
          ...data.circle,
          posts: data.posts || [],
          members: data.members || [],
          is_member: data.is_member
        });
        setFormData({
          name: data.circle.name,
          description: data.circle.description,
          industry: data.circle.industry,
          is_private: data.circle.is_private === 1
        });
      } else {
        setCircle(data);
        setFormData({
          name: data.name,
          description: data.description,
          industry: data.industry,
          is_private: data.is_private === 1
        });
      }
    } catch (error) {
      console.error('加载圈子详情失败:', error);
      setMessage({ type: 'error', text: '加载圈子详情失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircle();
  }, [id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleJoin = async () => {
    try {
      const response = await circlesAPI.join(id);
      setMessage({ type: 'success', text: response.data.message });
      loadCircle();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '加入失败' });
    }
  };

  const handleLeave = async () => {
    try {
      const response = await circlesAPI.leave(id);
      setMessage({ type: 'success', text: response.data.message });
      navigate('/circles');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '退出失败' });
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      const response = await circlesAPI.createPost(id, newPost.trim());
      setMessage({ type: 'success', text: response.data.message });
      setNewPost('');
      loadCircle();
      setTimeout(() => postsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '发帖失败' });
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('确定要删除这条帖子吗？')) {
      try {
        await circlesAPI.deletePost(id, postId);
        setMessage({ type: 'success', text: '帖子已删除' });
        loadCircle();
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.error || '删除失败' });
      }
    }
  };

  const handleAddComment = async (postId) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const response = await circlesAPI.addComment(id, postId, content);
      setMessage({ type: 'success', text: response.data.message });
      setCommentInputs({ ...commentInputs, [postId]: '' });
      loadCircle();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '评论失败' });
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (window.confirm('确定要删除这条评论吗？')) {
      try {
        await circlesAPI.deleteComment(id, postId, commentId);
        setMessage({ type: 'success', text: '评论已删除' });
        loadCircle();
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.error || '删除失败' });
      }
    }
  };

  const handleUpdateCircle = async (e) => {
    e.preventDefault();
    try {
      const response = await circlesAPI.update(id, formData);
      setMessage({ type: 'success', text: response.data.message });
      setShowEditModal(false);
      loadCircle();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || '更新失败' });
    }
  };

  const handleDeleteCircle = async () => {
    if (window.confirm('确定要删除这个圈子吗？此操作不可恢复！')) {
      try {
        await circlesAPI.delete(id);
        navigate('/circles');
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.error || '删除失败' });
      }
    }
  };

  const canManage = isAdmin || (circle && circle.creator_id === user?.id);

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

  if (!circle) {
    return (
      <div>
        <Navbar />
        <main className="main-content">
          <div className="container">
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>圈子不存在或无权限访问</p>
              <button className="btn btn-primary" onClick={() => navigate('/circles')}>
                返回圈子列表
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
            <button className="btn btn-secondary" onClick={() => navigate('/circles')}>
              ← 返回圈子列表
            </button>
          </div>

          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          <div className="profile-details">
            <div className="detail-item" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <h1 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>{circle.name}</h1>
                  <div style={{ opacity: 0.9, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {circle.industry && <span>🏢 {circle.industry}</span>}
                    <span>👥 {circle.member_count || 0} 成员</span>
                    <span>💬 {circle.post_count || 0} 帖子</span>
                    {circle.is_private === 1 && <span>🔒 私密</span>}
                  </div>
                </div>
                <div style={{ fontSize: '4rem' }}>👥</div>
              </div>
            </div>

            <div className="detail-item">
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>圈子描述</div>
              <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {circle.description || '暂无描述'}
              </div>
            </div>

            <div className="detail-item">
              <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>创建者</div>
              <div style={{ fontSize: '1.1rem' }}>{circle.creator_name || '未知'}</div>
            </div>

            <div className="detail-item">
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {circle.is_member ? (
                  <button className="btn btn-secondary" onClick={handleLeave}>
                    退出圈子
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleJoin}>
                    加入圈子
                  </button>
                )}

                {canManage && (
                  <>
                    <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
                      编辑圈子
                    </button>
                    <button className="btn btn-danger" onClick={handleDeleteCircle}>
                      删除圈子
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {circle.is_member && (
            <div className="profile-details" style={{ marginTop: '1.5rem' }}>
              <div className="detail-item">
                <h3 style={{ marginBottom: '1rem' }}>发表新帖</h3>
                <form onSubmit={handleCreatePost}>
                  <div className="form-group">
                    <textarea
                      className="form-textarea"
                      value={newPost}
                      onChange={e => setNewPost(e.target.value)}
                      placeholder="分享你的想法..."
                      rows="4"
                      required
                    />
                  </div>
                  <div className="search-actions">
                    <button type="submit" className="btn btn-primary">
                      发布
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>帖子列表</h2>
            {(!circle.posts || circle.posts.length === 0) ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>{circle.is_member ? '成为第一个发帖的人吧！' : '加入圈子后可以查看和发布帖子'}</p>
              </div>
            ) : (
              <div className="profile-details">
                {circle.posts.map(post => (
                  <div key={post.id} className="detail-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <strong>{post.author_name}</strong>
                        <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          {formatDate(post.created_at)}
                        </div>
                      </div>
                      {(isAdmin || post.author_id === user?.id) && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleDeletePost(post.id)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                      {post.content}
                    </div>

                    {circle.is_member && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, margin: 0, fontSize: '0.9rem' }}
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            placeholder="写评论..."
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={() => handleAddComment(post.id)}
                          >
                            评论
                          </button>
                        </div>
                      </div>
                    )}

                    {post.comments && post.comments.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '3px solid #e0e0e0' }}>
                        {post.comments.map(comment => (
                          <div key={comment.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <strong style={{ fontSize: '0.9rem' }}>{comment.author_name}</strong>
                                <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                  {formatDate(comment.created_at)}
                                </span>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                  {comment.content}
                                </div>
                              </div>
                              {(isAdmin || comment.author_id === user?.id) && (
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '0.125rem 0.375rem', fontSize: '0.65rem' }}
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                >
                                  删除
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={postsEndRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">编辑圈子</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateCircle}>
              <div className="form-group">
                <label className="form-label">圈子名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">圈子描述</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">所属行业</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.industry}
                  onChange={e => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="is_private_edit"
                  checked={formData.is_private}
                  onChange={e => setFormData({ ...formData, is_private: e.target.checked })}
                />
                <label htmlFor="is_private_edit">设为私密圈子（仅成员可见）</label>
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

export default CircleDetail;
