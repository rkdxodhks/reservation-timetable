import React, { useState, useEffect } from 'react';
import Timetable from './Timetable';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [studentId, setStudentId] = useState('');

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">예약 시스템</h1>
      <div className="form-group">
        <label htmlFor="studentId">학번</label>
        <input
          type="text"
          className="form-control"
          id="studentId"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="학번을 입력하세요"
        />
      </div>
      <Timetable studentId={studentId} />
    </div>
  );
}

export default App;
