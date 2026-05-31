import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { alumniAPI } from '../services/api';

const AlumniCard = ({ alumni }) => {
  const navigate = useNavigate();
  
  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div 
      className="card" 
      onClick={() => navigate(`/alumni/${alumni.id}`)}
    >
      <div className="card-avatar">{getInitials(alumni.name)}</div>
      <div className="card-content">
        <h3 className="card-name">{alumni.name}</h3>
        {alumni.graduation_year && (
          <span className="card-tag">{alumni.graduation_year}届</span>
        )}
        {alumni.major && (
          <span className="card-tag">{alumni.major}</span>
        )}
        <div className="card-position">
          {alumni.position || '职位未填写'}
          {alumni.company && ` @ ${alumni.company}`}
        </div>
        <div className="card-info">
          {alumni.city && `📍 ${alumni.city}`}
        </div>
        <div className="card-info">
          {alumni.industry && `🏭 ${alumni.industry}`}
        </div>
        {alumni.update_reminder_status === 'pending' && (
          <span className="reminder-badge">有待更新</span>
        )}
      </div>
    </div>
  );
};

const AlumniWall = () => {
  const [alumni, setAlumni] = useState([]);
  const [filters, setFilters] = useState({
    name: '',
    graduation_year: '',
    city: '',
    industry: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    cities: [],
    industries: [],
  });
  const [loading, setLoading] = useState(false);

  const loadAlumni = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });

      const response = await alumniAPI.getList(params);
      setAlumni(response.data.alumni);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('加载校友列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await alumniAPI.getFilters();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('加载筛选条件失败:', error);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadAlumni();
  }, [filters, pagination.page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadAlumni();
  };

  const handleReset = () => {
    setFilters({
      name: '',
      graduation_year: '',
      city: '',
      industry: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <div
          className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}
          onClick={() => pagination.page > 1 && handlePageChange(pagination.page - 1)}
        >
          上一页
        </div>
        {pages.map((page) => (
          <div
            key={page}
            className={`page-item ${pagination.page === page ? 'active' : ''}`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </div>
        ))}
        <div
          className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}
          onClick={() => pagination.page < pagination.totalPages && handlePageChange(pagination.page + 1)}
        >
          下一页
        </div>
      </div>
    );
  };

  return (
    <div>
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div className="search-filters">
            <h3 style={{ marginBottom: '1rem' }}>搜索校友</h3>
            <div className="search-row">
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="搜索姓名"
                  value={filters.name}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">届别</label>
                <select
                  name="graduation_year"
                  className="form-select"
                  value={filters.graduation_year}
                  onChange={handleFilterChange}
                >
                  <option value="">全部届别</option>
                  {filterOptions.years.map((year) => (
                    <option key={year} value={year}>
                      {year}届
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">城市</label>
                <select
                  name="city"
                  className="form-select"
                  value={filters.city}
                  onChange={handleFilterChange}
                >
                  <option value="">全部城市</option>
                  {filterOptions.cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">行业</label>
                <select
                  name="industry"
                  className="form-select"
                  value={filters.industry}
                  onChange={handleFilterChange}
                >
                  <option value="">全部行业</option>
                  {filterOptions.industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="search-actions">
              <button className="btn btn-primary" onClick={handleSearch}>
                搜索
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                重置
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', color: '#666' }}>
            共找到 {pagination.total} 位校友
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : alumni.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>暂无校友数据</p>
            </div>
          ) : (
            <>
              <div className="alumni-wall">
                {alumni.map((item) => (
                  <AlumniCard key={item.id} alumni={item} />
                ))}
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AlumniWall;
