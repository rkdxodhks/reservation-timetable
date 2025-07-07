import React, { useState } from 'react';
import Timetable from './Timetable';
import { LABS } from './constants';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [studentId, setStudentId] = useState('');
  const [authNumber, setAuthNumber] = useState('');
  const [selectedLab, setSelectedLab] = useState(LABS[0]);
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);

  const handleDateChange = (date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="container-fluid mt-4">
      <header className="text-center mb-4">
        <h1>BAF 실험실 예약 시스템</h1>
      </header>

      <div className="row">
        {/* Left Sidebar for Lab Selection */}
        <nav className="col-12 col-md-3 col-lg-2 bg-light sidebar">
          <div className="position-sticky pt-3">
            <img src="/bio-mat-logo.jpg" alt="Bio-Mat Logo" className="img-fluid mb-3" />
            <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
              <span>실험실 목록</span>
            </h6>
            <ul className="nav flex-column">
              {LABS.map(lab => (
                <li key={lab} className="nav-item">
                  <button 
                    className={`nav-link ${selectedLab === lab ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedLab(lab);
                    }}
                  >
                    {lab}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="col-12 col-md-9 col-lg-10 px-md-4">
          <div className="card p-3 mb-4 shadow-sm">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label htmlFor="studentId" className="form-label">학번</label>
                <input
                  type="text"
                  className="form-control"
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="학번을 입력하세요"
                />
              </div>
              <div className="col-md-3">
                <label htmlFor="authNumber" className="form-label">인증번호</label>
                <input
                  type="password"
                  className="form-control"
                  id="authNumber"
                  value={authNumber}
                  onChange={(e) => setAuthNumber(e.target.value)}
                  placeholder="인증번호 4자리"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">날짜 선택</label>
                <div className="d-grid gap-2 d-md-flex">
                  <button 
                    className={`btn ${selectedDate === today.toISOString().split('T')[0] ? 'btn-primary' : 'btn-outline-primary'}`} 
                    onClick={() => handleDateChange(today)}
                  >
                    첫째날
                  </button>
                  <button 
                    className={`btn ${selectedDate === tomorrow.toISOString().split('T')[0] ? 'btn-primary' : 'btn-outline-primary'}`} 
                    onClick={() => handleDateChange(tomorrow)}
                  >
                    둘째날
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-3 mb-4 shadow-sm">
            <p className="mb-1"><strong>시스템 사용법</strong></p>
            <p className="mb-0">학번과 인증번호를 입력하고, 원하는 실험실과 날짜를 선택한 후 예약을 진행하세요.</p>
            <p className="mb-0">본인 예약은 초록색, 타인 예약은 노란색, 예약 마감은 빨간색으로 표시됩니다.</p>
          </div>

          <Timetable 
            studentId={studentId} 
            authNumber={authNumber}
            selectedLab={selectedLab}
            selectedDate={selectedDate}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
