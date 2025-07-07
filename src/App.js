import React, { useState, useEffect, useCallback, useRef } from 'react';
import StatusPanel from './StatusPanel';
import Timetable from './Timetable';
import { LABS } from './constants';
import { supabase } from './supabaseClient';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [studentId, setStudentId] = useState('');
  const [authNumber, setAuthNumber] = useState('');
  const [selectedLab, setSelectedLab] = useState(LABS[0]);
  const [reservationsByDate, setReservationsByDate] = useState({ today: [], tomorrow: [] });
  const channelRef = useRef(null);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const fetchAllReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .in('date', [todayStr, tomorrowStr]);

    if (error) {
      console.error('Error fetching reservations:', error);
    } else {
      setReservationsByDate({
        today: data.filter(r => r.date === todayStr),
        tomorrow: data.filter(r => r.date === tomorrowStr),
      });
    }
  }, [todayStr, tomorrowStr]);

  useEffect(() => {
    fetchAllReservations();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('reservations-all-days')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `date=in.(${todayStr},${tomorrowStr})` }, 
        () => fetchAllReservations()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [todayStr, tomorrowStr, fetchAllReservations]);

  const handleDateChange = (date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="container mt-4">
      <header className="text-center mb-4">
        <img src="/bio-mat-logo.jpg" alt="Bio-Mat Logo" className="img-fluid mb-3" style={{ maxWidth: '150px' }} />
        <h1>BAF 실험실 예약 시스템</h1>
      </header>

      <main>
        <StatusPanel 
          reservationsByDate={reservationsByDate} 
          selectedLab={selectedLab}
          onLabSelect={setSelectedLab}
        />

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
                      className={`btn ${selectedDate === todayStr ? 'btn-primary' : 'btn-outline-primary'}`} 
                      onClick={() => handleDateChange(today)}
                  >
                      첫째날
                  </button>
                  <button 
                      className={`btn ${selectedDate === tomorrowStr ? 'btn-primary' : 'btn-outline-primary'}`} 
                      onClick={() => handleDateChange(tomorrow)}
                  >
                      둘째날
                  </button>
                  </div>
              </div>
          </div>
        </div>

        <Timetable 
          studentId={studentId} 
          authNumber={authNumber}
          selectedLab={selectedLab}
          selectedDate={selectedDate}
          reservations={selectedDate === todayStr ? reservationsByDate.today.filter(r => r.lab_id === selectedLab) : reservationsByDate.tomorrow.filter(r => r.lab_id === selectedLab)}
          onReservationUpdate={fetchAllReservations}
        />
      </main>
    </div>
  );
}

export default App;
