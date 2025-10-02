import React, { useState, useEffect, useCallback, useRef } from "react";
import { LabsList, MyReservations } from "./StatusPanel";
import Timetable from "./Timetable";
import { LABS, MAX_RESERVATIONS_PER_SLOT } from "./constants";
import { supabase } from "./supabaseClient";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Modal, Button, Spinner } from "react-bootstrap";

// Main App Component
function App() {
  // Global State
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [authNumber, setAuthNumber] = useState("");
  const [selectedLab, setSelectedLab] = useState(LABS[0]);
  const [reservationsByDate, setReservationsByDate] = useState({ today: [], tomorrow: [] });
  const [selectedDate, setSelectedDate] = useState("");
  const [currentReservationCount, setCurrentReservationCount] = useState(0);

  // UI & Modal State
  const [loading, setLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [modalContext, setModalContext] = useState(null);

  const channelRef = useRef(null);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  useEffect(() => {
    setSelectedDate(todayStr);
  }, [todayStr]);

  const fetchAllReservations = useCallback(async () => {
    const { data, error } = await supabase.from("reservations").select("*").in("date", [todayStr, tomorrowStr]);
    if (error) {
      console.error("Error fetching reservations:", error);
      setReservationsByDate({ today: [], tomorrow: [] });
    } else {
      setReservationsByDate({
        today: (data || []).filter((r) => r.date === todayStr),
        tomorrow: (data || []).filter((r) => r.date === tomorrowStr),
      });
    }
  }, [todayStr, tomorrowStr]);

  useEffect(() => {
    fetchAllReservations();
    const channel = supabase.channel("reservations-all-days").on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchAllReservations).subscribe();
    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [fetchAllReservations]);

  const updateReservationCount = useCallback(() => {
    if (!studentId) {
      setCurrentReservationCount(0);
      return;
    }
    const allReservations = [...reservationsByDate.today, ...reservationsByDate.tomorrow];
    const count = allReservations.filter((r) => r.student_id === studentId).length;
    setCurrentReservationCount(count);
  }, [studentId, reservationsByDate]);

  useEffect(() => {
    updateReservationCount();
  }, [studentId, reservationsByDate, updateReservationCount]);

  const handleShowReservationModal = (context) => {
    if (!studentId || !authNumber || !studentName) {
      toast.error("예약자 정보를 모두 입력해주세요.");
      setShowInfoModal(true);
      return;
    }
    setModalContext(context);
    setShowReservationModal(true);
  };

  const handleTimeSlotClick = (timeSlot, reservationsForSlot) => {
    const isMyReservation = reservationsForSlot.some((r) => r.student_id === studentId);
    handleShowReservationModal({ type: isMyReservation ? "cancel" : "confirm", timeSlot, lab: selectedLab, date: selectedDate, reservationsForSlot });
  };

  const handleMyReservationClick = (reservation) => {
    handleShowReservationModal({ type: "cancel", timeSlot: reservation.time_slot, lab: reservation.lab_id, date: reservation.date, reservationId: reservation.id });
  };

  const handleConfirmReservation = async () => {
    if (!modalContext) return;
    setLoading(true);
    try {
      const { count, error: countError } = await supabase.from("reservations").select("id", { head: true, count: 'exact' }).eq("student_id", studentId);
      if (countError) throw countError;
      if (count >= 2) {
        toast.error("예약은 최대 2회까지만 가능합니다.");
        return;
      }
      const { error } = await supabase.from("reservations").insert([{ time_slot: modalContext.timeSlot, student_id: studentId, student_name: studentName, auth_number: authNumber, date: modalContext.date, lab_id: modalContext.lab }]);
      if (error) throw error;
      toast.success("예약이 완료되었습니다.");
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error(`예약 실패: ${error.message}`);
    } finally {
      setLoading(false);
      setShowReservationModal(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!modalContext) return;
    setLoading(true);
    try {
      const { data: res, error: fetchError } = await supabase.from("reservations").select("id, auth_number").eq("time_slot", modalContext.timeSlot).eq("date", modalContext.date).eq("lab_id", modalContext.lab).eq("student_id", studentId).single();
      if (fetchError || !res) throw new Error("취소할 예약 정보를 찾을 수 없습니다.");
      const MASTER_AUTH_NUMBER = process.env.REACT_APP_MASTER_AUTH_NUMBER;
      if (authNumber !== MASTER_AUTH_NUMBER && res.auth_number !== authNumber) {
        toast.error("인증번호가 일치하지 않습니다.");
        return;
      }
      const { error: deleteError } = await supabase.from("reservations").delete().match({ id: res.id });
      if (deleteError) throw deleteError;
      toast.success("예약이 취소되었습니다.");
    } catch (error) {
      console.error("Error canceling reservation:", error);
      toast.error(`예약 취소 실패: ${error.message}`);
    } finally {
      setLoading(false);
      setShowReservationModal(false);
    }
  };

  return (
    <div className="container p-0 p-sm-4">
      <main>
        <div className="lab-filter-header">
          <LabsList selectedLab={selectedLab} onLabSelect={setSelectedLab} />
        </div>
        <Timetable studentId={studentId} selectedLab={selectedLab} reservations={selectedDate === todayStr ? reservationsByDate.today.filter(r => r.lab_id === selectedLab) : reservationsByDate.tomorrow.filter(r => r.lab_id === selectedLab)} currentReservationCount={currentReservationCount} onCardClick={handleTimeSlotClick} />
        
        <button className="fab" onClick={() => setShowInfoModal(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
        </button>

        <InfoModal 
          show={showInfoModal} 
          onHide={() => setShowInfoModal(false)}
          {...{ studentId, setStudentId, studentName, setStudentName, authNumber, setAuthNumber, selectedDate, setSelectedDate, todayStr, tomorrowStr, reservationsByDate, currentReservationCount, handleMyReservationClick }}
        />

        <ReservationModal show={showReservationModal} onHide={() => setShowReservationModal(false)} context={modalContext} loading={loading} onConfirm={handleConfirmReservation} onCancel={handleCancelReservation} dialogClassName="info-modal" />
        
        <ToastContainer position="bottom-center" autoClose={2000} hideProgressBar newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss={false} draggable={false} pauseOnHover theme="colored" />
      </main>
    </div>
  );
}

// Helper: Info Modal
const InfoModal = (props) => {
  const { show, onHide, studentId, setStudentId, studentName, setStudentName, authNumber, setAuthNumber, selectedDate, setSelectedDate, todayStr, tomorrowStr, reservationsByDate, currentReservationCount, handleMyReservationClick } = props;
  return (
    <Modal show={show} onHide={onHide} centered scrollable dialogClassName="info-modal">
      <Modal.Header closeButton>
        <Modal.Title as="h5">정보 및 설정</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center mb-4">
          <img src="/baf-logo.png" alt="BAF Logo" className="img-fluid" style={{ maxWidth: "120px" }} />
        </div>
        <div className="card p-3 my-3">
          <h5 className="card-title mb-3">날짜 선택</h5>
          <div className="row g-2">
            <div className="col-6"><button className={`btn w-100 fs-5 fw-bold ${selectedDate === todayStr ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setSelectedDate(todayStr)}>11/11</button></div>
            <div className="col-6"><button className={`btn w-100 fs-5 fw-bold ${selectedDate === tomorrowStr ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setSelectedDate(tomorrowStr)}>11/12</button></div>
          </div>
        </div>
        <MyReservations studentId={studentId} reservationsByDate={reservationsByDate} currentReservationCount={currentReservationCount} onReservationClick={handleMyReservationClick} />
        <div className="card p-3 my-3">
          <h5 className="card-title mb-3">예약자 정보</h5>
          <div className="row g-2 mb-2">
            <div className="col-6"><label className="form-label small">학번</label><input type="text" className="form-control" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="학번" /></div>
            <div className="col-6"><label className="form-label small">이름</label><input type="text" className="form-control" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="이름" /></div>
          </div>
          <div><label className="form-label small">인증번호</label><input type="password" className="form-control" value={authNumber} onChange={(e) => setAuthNumber(e.target.value)} placeholder="4자리" /></div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide} className="w-100">닫기</Button>
      </Modal.Footer>
    </Modal>
  );
}

// Helper: Reservation Action Modal
const ReservationModal = ({ show, onHide, context, loading, onConfirm, onCancel }) => {
  if (!context) return null;
  const { type, timeSlot, lab, reservationsForSlot } = context;
  const isMyReservation = type === 'cancel';
  const isFull = !isMyReservation && reservationsForSlot && reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT;
  let title = `${lab} - ${timeSlot.split(' ')[0]}`;
  let body = null;
  let footer = null;

  const formatReservationDisplay = (r) => `${r.student_id || ""} ${r.student_name || ""}`.trim();

  const bookedBy = (
    reservationsForSlot && reservationsForSlot.length > 0 && (
      <div className="mt-3">
        <small className="text-muted">현재 예약자:</small>
        <ul className="list-unstyled mt-1 small">
          {reservationsForSlot.map(r => <li key={r.id}>- {formatReservationDisplay(r)}</li>)}
        </ul>
      </div>
    )
  );

  if (isMyReservation) {
    title = "예약 취소";
    body = <p><strong>{lab} - {timeSlot.split(' ')[0]}</strong> 예약을 취소하시겠습니까?</p>;
    footer = <><Button variant="secondary" onClick={onHide} disabled={loading}>닫기</Button><Button variant="danger" onClick={onCancel} disabled={loading}>{loading ? <Spinner size="sm" /> : "예약 취소"}</Button></>;
  } else if (isFull) {
    title = "예약 마감";
    body = <><p>이 시간대는 예약이 모두 마감되었습니다.</p>{bookedBy}</>;
    footer = <Button variant="secondary" onClick={onHide}>닫기</Button>;
  } else {
    title = "새 예약";
    body = <><p><strong>{lab} - {timeSlot.split(' ')[0]}</strong>에 예약하시겠습니까?</p>{bookedBy}</>;
    footer = <><Button variant="secondary" onClick={onHide} disabled={loading}>닫기</Button><Button variant="primary" onClick={onConfirm} disabled={loading}>{loading ? <Spinner size="sm" /> : "예약하기"}</Button></>;
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop={loading ? "static" : true}>
      <Modal.Header closeButton><Modal.Title as="h5">{title}</Modal.Title></Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>{footer}</Modal.Footer>
    </Modal>
  );
};

export default App;
