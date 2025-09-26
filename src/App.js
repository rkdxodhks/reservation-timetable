import React, { useState, useEffect, useCallback, useRef } from "react";
import StatusPanel from "./StatusPanel";
import Timetable from "./Timetable";
import { LABS } from "./constants";
import { supabase } from "./supabaseClient";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [authNumber, setAuthNumber] = useState("");
  const [selectedLab, setSelectedLab] = useState(LABS[0]);
  const [reservationsByDate, setReservationsByDate] = useState({
    today: [],
    tomorrow: [],
  });
  const channelRef = useRef(null);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentReservationCount, setCurrentReservationCount] = useState(0);

  const fetchAllReservations = useCallback(async () => {
    console.log("Fetching reservations for dates:", [todayStr, tomorrowStr]);
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .in("date", [todayStr, tomorrowStr]);

    console.log("Fetch result:", { data, error });

    if (error) {
      console.error("Error fetching reservations:", error);
      console.error("Fetch error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      // 오류가 발생해도 빈 배열로 설정하여 앱이 계속 작동하도록 함
      setReservationsByDate({
        today: [],
        tomorrow: [],
      });
    } else {
      console.log("Fetched reservations data:", data); // 디버깅용
      setReservationsByDate({
        today: (data || []).filter((r) => r.date === todayStr),
        tomorrow: (data || []).filter((r) => r.date === tomorrowStr),
      });
    }
  }, [todayStr, tomorrowStr]);

  useEffect(() => {
    fetchAllReservations();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("reservations-all-days")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `date=in.(${todayStr},${tomorrowStr})`,
        },
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
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  // 현재 선택된 날짜와 학번에 대한 예약 횟수 계산
  const updateReservationCount = useCallback(() => {
    if (!studentId) {
      setCurrentReservationCount(0);
      return;
    }

    const currentReservations =
      selectedDate === todayStr
        ? reservationsByDate.today
        : reservationsByDate.tomorrow;

    const count = currentReservations.filter(
      (r) => r.student_id === studentId
    ).length;
    setCurrentReservationCount(count);
  }, [studentId, selectedDate, todayStr, reservationsByDate]);

  useEffect(() => {
    updateReservationCount();
  }, [updateReservationCount]);

  return (
    <div className="container mt-4">
      <header className="text-center mb-5">
        <img
          src="/baf-logo.png"
          alt="BAF Logo"
          className="img-fluid mb-3"
          style={{ maxWidth: "220px" }}
        />
        <h1>연구실 체험부스 예약 시스템(2025)</h1>
      </header>

      <main>
        <StatusPanel
          reservationsByDate={reservationsByDate}
          selectedLab={selectedLab}
          onLabSelect={setSelectedLab}
        />

        <div className="row g-4 mb-5">
          <div className="col-12 col-lg-4">
            <div className="card p-4 h-100 shadow-sm">
              <p className="mb-2 fw-bold">날짜 선택</p>
              <div className="d-grid gap-2">
                <button
                  className={`btn ${
                    selectedDate === todayStr
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => handleDateChange(today)}
                >
                  11/11 (첫째날)
                </button>
                <button
                  className={`btn ${
                    selectedDate === tomorrowStr
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => handleDateChange(tomorrow)}
                >
                  11/12 (둘째날)
                </button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <div className="card p-4 h-100 shadow-sm">
              <p className="mb-2 fw-bold">예약자 정보</p>
              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="studentId" className="form-label">
                    학번
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="학번"
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="studentName" className="form-label">
                    이름
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="이름"
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="authNumber" className="form-label">
                    인증번호
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="authNumber"
                    value={authNumber}
                    onChange={(e) => setAuthNumber(e.target.value)}
                    placeholder="4자리"
                  />
                </div>
              </div>
              {studentId && (
                <div className="mt-3 p-2 bg-light rounded">
                  <small className="text-muted">
                    <strong>현재 예약 현황:</strong> {currentReservationCount}
                    /2회
                    {currentReservationCount >= 2 && (
                      <span className="text-danger ms-2">
                        (최대 예약 횟수 도달)
                      </span>
                    )}
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card p-3 mb-4 shadow-sm">
          <p className="mb-1 fw-bold">시스템 사용법</p>
          <p className="mb-0">
            학번과 인증번호를 입력하고, 원하는 실험실과 날짜를 선택한 후 예약을
            진행하세요.
          </p>
          <p className="mb-0">
            <strong>예약 제한:</strong> 한 학번당 하루에 최대 2회까지 예약
            가능합니다.
          </p>
          <p className="mb-0">
            본인 예약은 <span className="text-success fw-bold">초록색</span>,
            타인 예약은 <span className="text-warning fw-bold">노란색</span>,
            예약 마감은 <span className="text-danger fw-bold">빨간색</span>,
            예약 제한 도달은{" "}
            <span className="text-secondary fw-bold">회색</span>으로 표시됩니다.
          </p>
        </div>

        <Timetable
          studentId={studentId}
          studentName={studentName}
          authNumber={authNumber}
          selectedLab={selectedLab}
          selectedDate={selectedDate}
          reservations={
            selectedDate === todayStr
              ? reservationsByDate.today.filter((r) => r.lab_id === selectedLab)
              : reservationsByDate.tomorrow.filter(
                  (r) => r.lab_id === selectedLab
                )
          }
          currentReservationCount={currentReservationCount}
          onReservationUpdate={fetchAllReservations}
        />
      </main>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;
