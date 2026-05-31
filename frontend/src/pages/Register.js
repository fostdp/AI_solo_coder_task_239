import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    graduation_year: '',
    major: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      navigate('/alumni');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <h2 className="auth-title">校友注册</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="请输入姓名"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱"
              required
            />
          </div>
          <div className="search-row">
            <div className="form-group">
              <label className="form-label">毕业年份</label>
              <select
                name="graduation_year"
                className="form-select"
                value={formData.graduation_year}
                onChange={handleChange}
                required
              >
                <option value="">请选择</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">专业</label>
              <input
                type="text"
                name="major"
                className="form-input"
                value={formData.major}
                onChange={handleChange}
                placeholder="请输入专业"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码（至少6位）"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="请再次输入密码"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <div className="auth-link">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
