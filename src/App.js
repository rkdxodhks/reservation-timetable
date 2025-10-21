import React, { useState, useEffect, useCallback, useRef } from "react";
import { LabsList, MyReservations } from "./StatusPanel";
import Timetable from "./Timetable";
import { LABS, MAX_RESERVATIONS_PER_SLOT } from "./constants";
import { supabase } from "./supabaseClient";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Modal,
  Button,
  Spinner,
  Tooltip,
  OverlayTrigger,
} from "react-bootstrap";
import { ToastContainer, toast, Slide } from "react-toastify";
import { useSwipeable } from "react-swipeable";

// Main App Component
function App() {
  // Global State
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [authNumber, setAuthNumber] = useState("");
  const [selectedLab, setSelectedLab] = useState(LABS[0]);
  const [reservationsByDate, setReservationsByDate] = useState({
    today: [],
    tomorrow: [],
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [currentReservationCount, setCurrentReservationCount] = useState(0);

  // UI & Modal State
  const [loading, setLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [modalContext, setModalContext] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: 정보입력, 2: 확인, 3: 완료
  const [validationErrors, setValidationErrors] = useState({});
  const [dateToggleAnimation, setDateToggleAnimation] = useState(false);

  const channelRef = useRef(null);
  const todayStr = "2025-11-11";
  const tomorrowStr = "2025-11-12";

  useEffect(() => {
    setSelectedDate(todayStr);
  }, [todayStr]);

  const fetchAllReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .in("date", [todayStr, tomorrowStr]);
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
    const channel = supabase
      .channel("reservations-all-days")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        fetchAllReservations
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchAllReservations]);

  const updateReservationCount = useCallback(() => {
    if (!studentId) {
      setCurrentReservationCount(0);
      return;
    }
    const allReservations = [
      ...reservationsByDate.today,
      ...reservationsByDate.tomorrow,
    ];
    const count = allReservations.filter(
      (r) => r.student_id === studentId
    ).length;
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
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );
    handleShowReservationModal({
      type: isMyReservation ? "cancel" : "confirm",
      timeSlot,
      lab: selectedLab,
      date: selectedDate,
      reservationsForSlot,
    });
  };

  const handleMyReservationClick = (reservation) => {
    handleShowReservationModal({
      type: "cancel",
      timeSlot: reservation.time_slot,
      lab: reservation.lab_id,
      date: reservation.date,
      reservationId: reservation.id,
    });
  };

  const handleConfirmReservation = async () => {
    if (!modalContext) return;
    setLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from("reservations")
        .select("id", { head: true, count: "exact" })
        .eq("student_id", studentId);
      if (countError) throw countError;
      if (count >= 2) {
        toast.error("예약은 최대 2회까지만 가능합니다.");
        return;
      }
      const { error } = await supabase.from("reservations").insert([
        {
          time_slot: modalContext.timeSlot,
          student_id: studentId,
          student_name: studentName,
          auth_number: authNumber,
          date: modalContext.date,
          lab_id: modalContext.lab,
        },
      ]);
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
      const { data: res, error: fetchError } = await supabase
        .from("reservations")
        .select("id, auth_number")
        .eq("time_slot", modalContext.timeSlot)
        .eq("date", modalContext.date)
        .eq("lab_id", modalContext.lab)
        .eq("student_id", studentId)
        .single();
      if (fetchError || !res)
        throw new Error("취소할 예약 정보를 찾을 수 없습니다.");
      const MASTER_AUTH_NUMBER = process.env.REACT_APP_MASTER_AUTH_NUMBER;
      if (authNumber !== MASTER_AUTH_NUMBER && res.auth_number !== authNumber) {
        toast.error("인증번호가 일치하지 않습니다.");
        return;
      }
      const { error: deleteError } = await supabase
        .from("reservations")
        .delete()
        .match({ id: res.id });
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

  const handleDateToggle = () => {
    setDateToggleAnimation(true);
    setSelectedDate((currentDate) =>
      currentDate === todayStr ? tomorrowStr : todayStr
    );

    // 애니메이션 상태 초기화
    setTimeout(() => {
      setDateToggleAnimation(false);
    }, 600);
  };

  const handleConfirmInfo = () => {
    if (!studentId || !authNumber || !studentName) {
      toast.error("예약자 정보를 모두 입력해주세요.");
      return;
    }
    if (Object.keys(validationErrors).length > 0) {
      toast.error("입력 정보를 확인해주세요.");
      return;
    }
    setCurrentStep(3); // 완료 단계로 이동
    setTimeout(() => {
      toast.success("✅ 정보 확인이 완료되었습니다!");
      setShowInfoModal(false);
      setCurrentStep(1); // 다음 모달 열기를 위해 초기화
    }, 2000);
  };

  const handleShowInfoModal = () => {
    setCurrentStep(1); // 모달 열 때 첫 번째 단계로 초기화
    setShowInfoModal(true);
  };

  const handleHideInfoModal = () => {
    setShowInfoModal(false);
    setCurrentStep(1); // 모달 닫을 때 초기화
    setValidationErrors({}); // 유효성 검사 오류 초기화
  };

  // 실시간 유효성 검사
  const validateField = (field, value) => {
    const errors = { ...validationErrors };

    switch (field) {
      case "studentId":
        if (!value) {
          errors.studentId = "학번을 입력해주세요";
        } else if (!/^\d{9}$/.test(value)) {
          errors.studentId = "학번은 9자리 숫자여야 합니다";
        } else {
          delete errors.studentId;
        }
        break;
      case "studentName":
        if (!value) {
          errors.studentName = "이름을 입력해주세요";
        } else if (value.length < 2) {
          errors.studentName = "이름은 2자 이상 입력해주세요";
        } else {
          delete errors.studentName;
        }
        break;
      case "authNumber":
        if (!value) {
          errors.authNumber = "인증번호를 입력해주세요";
        } else if (!/^\d{4}$/.test(value)) {
          errors.authNumber = "인증번호는 4자리 숫자여야 합니다";
        } else {
          delete errors.authNumber;
        }
        break;
      default:
        // 알 수 없는 필드에 대한 기본 처리
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatDate = (dateStr) =>
    dateStr ? dateStr.substring(5).replace("-", "/") : "";

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setSelectedDate(tomorrowStr),
    onSwipedRight: () => setSelectedDate(todayStr),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  return (
    <div className="container p-0 p-sm-4">
      <main>
        <div className="lab-filter-header">
          <LabsList selectedLab={selectedLab} onLabSelect={setSelectedLab} />
        </div>
        <div {...swipeHandlers}>
          <Timetable
            key={selectedDate}
            studentId={studentId}
            selectedLab={selectedLab}
            reservations={
              selectedDate === todayStr
                ? reservationsByDate.today.filter(
                    (r) => r.lab_id === selectedLab
                  )
                : reservationsByDate.tomorrow.filter(
                    (r) => r.lab_id === selectedLab
                  )
            }
            currentReservationCount={currentReservationCount}
            onCardClick={handleTimeSlotClick}
          />
        </div>

        <button
          className={`fab-left ${
            dateToggleAnimation ? "date-toggle-animation" : ""
          }`}
          onClick={handleDateToggle}
        >
          <span className="fab-date">{formatDate(selectedDate)}</span>
        </button>

        <OverlayTrigger
          placement="left"
          overlay={<Tooltip>정보 및 설정</Tooltip>}
        >
          <button className="fab" onClick={handleShowInfoModal}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
        </OverlayTrigger>

        <InfoModal
          show={showInfoModal}
          onHide={handleHideInfoModal}
          onConfirm={handleConfirmInfo}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          validationErrors={validationErrors}
          validateField={validateField}
          {...{
            studentId,
            setStudentId,
            studentName,
            setStudentName,
            authNumber,
            setAuthNumber,
            reservationsByDate,
            currentReservationCount,
            handleMyReservationClick,
            todayStr,
          }}
        />

        <ReservationModal
          show={showReservationModal}
          onHide={() => setShowReservationModal(false)}
          context={modalContext}
          loading={loading}
          onConfirm={handleConfirmReservation}
          onCancel={handleCancelReservation}
          dialogClassName="info-modal"
        />

        <ToastContainer
          position="bottom-center"
          autoClose={2000}
          hideProgressBar
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable={false}
          pauseOnHover
          theme="colored"
          transition={Slide}
        />
      </main>
    </div>
  );
}

// Helper: Info Modal
const InfoModal = (props) => {
  const {
    show,
    onHide,
    onConfirm,
    currentStep,
    setCurrentStep,
    validationErrors,
    validateField,
    studentId,
    setStudentId,
    studentName,
    setStudentName,
    authNumber,
    setAuthNumber,
    reservationsByDate,
    currentReservationCount,
    handleMyReservationClick,
    todayStr,
  } = props;
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      scrollable
      dialogClassName="info-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">정보 및 설정</Modal.Title>
      </Modal.Header>

      {/* 스텝 바 */}
      <div className="modal-step-bar">
        <div className="step-indicator">
          <div
            className={`step ${currentStep >= 1 ? "active" : ""} ${
              currentStep > 1 ? "completed" : ""
            }`}
          >
            <div className="step-number">1</div>
            <div className="step-label">정보입력</div>
          </div>
          <div
            className={`step-connector ${currentStep > 1 ? "completed" : ""}`}
          ></div>
          <div
            className={`step ${currentStep >= 2 ? "active" : ""} ${
              currentStep > 2 ? "completed" : ""
            }`}
          >
            <div className="step-number">2</div>
            <div className="step-label">확인</div>
          </div>
          <div
            className={`step-connector ${currentStep > 2 ? "completed" : ""}`}
          ></div>
          <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
            <div className="step-number">3</div>
            <div className="step-label">완료</div>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          ></div>
        </div>
        {/* 현재 단계 안내 */}
        <div className="step-guidance">
          {currentStep === 1 && (
            <div className="guidance-text">
              <span className="guidance-icon">📝</span>
              예약자 정보를 입력해주세요
            </div>
          )}
          {currentStep === 2 && (
            <div className="guidance-text">
              <span className="guidance-icon">👀</span>
              입력하신 정보를 확인해주세요
            </div>
          )}
          {currentStep === 3 && (
            <div className="guidance-text">
              <span className="guidance-icon">✅</span>
              정보 확인이 완료되었습니다
            </div>
          )}
        </div>
      </div>

      <Modal.Body>
        {/* 스텝 1: 정보 입력 */}
        {currentStep === 1 && (
          <>
            <div className="text-center mb-3">
              <img
                src="/baf-logo.png"
                alt="BAF Logo"
                className="img-fluid"
                style={{ maxWidth: "120px" }}
              />
            </div>
            <MyReservations
              studentId={studentId}
              reservationsByDate={reservationsByDate}
              currentReservationCount={currentReservationCount}
              onReservationClick={handleMyReservationClick}
              todayStr={todayStr}
            />
            <div className="card p-2 my-2">
              <h5 className="card-title mb-2">예약자 정보</h5>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>학번을 입력해주세요 (예: 202412345)</Tooltip>
                    }
                  >
                    <label className="form-label small">학번</label>
                  </OverlayTrigger>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`form-control ${
                      validationErrors.studentId ? "is-invalid" : ""
                    }`}
                    value={studentId}
                    onChange={(e) => {
                      setStudentId(e.target.value);
                      validateField("studentId", e.target.value);
                    }}
                    placeholder="학번"
                  />
                  {validationErrors.studentId && (
                    <div className="invalid-feedback">
                      {validationErrors.studentId}
                    </div>
                  )}
                </div>
                <div className="col-6">
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>본인의 이름을 입력해주세요</Tooltip>}
                  >
                    <label className="form-label small">이름</label>
                  </OverlayTrigger>
                  <input
                    type="text"
                    className={`form-control ${
                      validationErrors.studentName ? "is-invalid" : ""
                    }`}
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      validateField("studentName", e.target.value);
                    }}
                    placeholder="이름"
                  />
                  {validationErrors.studentName && (
                    <div className="invalid-feedback">
                      {validationErrors.studentName}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip>4자리 숫자 인증번호를 입력해주세요</Tooltip>
                  }
                >
                  <label className="form-label small">인증번호</label>
                </OverlayTrigger>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`form-control ${
                    validationErrors.authNumber ? "is-invalid" : ""
                  }`}
                  value={authNumber}
                  onChange={(e) => {
                    setAuthNumber(e.target.value);
                    validateField("authNumber", e.target.value);
                  }}
                  placeholder="4자리"
                />
                {validationErrors.authNumber && (
                  <div className="invalid-feedback">
                    {validationErrors.authNumber}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 스텝 2: 확인 */}
        {currentStep === 2 && (
          <div className="text-center">
            <div className="mb-4">
              <div className="check-icon">✓</div>
              <h5>입력 정보 확인</h5>
              <p className="text-muted">입력하신 정보가 맞는지 확인해주세요.</p>
            </div>
            <div className="card p-3">
              <div className="row g-2">
                <div className="col-4">
                  <strong>학번:</strong>
                </div>
                <div className="col-8">{studentId || "미입력"}</div>
                <div className="col-4">
                  <strong>이름:</strong>
                </div>
                <div className="col-8">{studentName || "미입력"}</div>
                <div className="col-4">
                  <strong>인증번호:</strong>
                </div>
                <div className="col-8">{authNumber ? "●●●●" : "미입력"}</div>
              </div>
            </div>
          </div>
        )}

        {/* 스텝 3: 완료 */}
        {currentStep === 3 && (
          <div className="text-center">
            <div className="mb-4">
              <div className="success-icon">🎉</div>
              <h5>확인 완료!</h5>
              <p className="text-muted">정보가 성공적으로 확인되었습니다.</p>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {currentStep === 1 && (
          <>
            <Button
              variant="primary"
              onClick={() => setCurrentStep(2)}
              className="me-2"
              disabled={
                Object.keys(validationErrors).length > 0 ||
                !studentId ||
                !studentName ||
                !authNumber
              }
            >
              다음 단계
            </Button>
            <Button variant="secondary" onClick={onHide}>
              닫기
            </Button>
          </>
        )}
        {currentStep === 2 && (
          <>
            <Button variant="success" onClick={onConfirm} className="me-2">
              확인 완료
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setCurrentStep(1)}
              className="me-2"
            >
              이전
            </Button>
            <Button variant="secondary" onClick={onHide}>
              닫기
            </Button>
          </>
        )}
        {currentStep === 3 && (
          <Button variant="secondary" onClick={onHide} className="w-100">
            닫기
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

// Helper: Reservation Action Modal
const ReservationModal = ({
  show,
  onHide,
  context,
  loading,
  onConfirm,
  onCancel,
}) => {
  if (!context) return null;
  const { type, timeSlot, lab, reservationsForSlot } = context;
  const isMyReservation = type === "cancel";
  const isFull =
    !isMyReservation &&
    reservationsForSlot &&
    reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT;
  let title = `${lab} - ${timeSlot.split(" ")[0]}`;
  let body = null;
  let footer = null;

  const formatReservationDisplay = (r) =>
    `${r.student_id || ""} ${r.student_name || ""}`.trim();

  const bookedBy = reservationsForSlot && reservationsForSlot.length > 0 && (
    <div className="mt-3">
      <small className="text-muted">현재 예약자:</small>
      <ul className="list-unstyled mt-1 small">
        {reservationsForSlot.map((r) => (
          <li key={r.id}>- {formatReservationDisplay(r)}</li>
        ))}
      </ul>
    </div>
  );

  if (isMyReservation) {
    title = "예약 취소";
    body = (
      <p>
        <strong>
          {lab} - {timeSlot.split(" ")[0]}
        </strong>{" "}
        예약을 취소하시겠습니까?
      </p>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          닫기
        </Button>
        <Button variant="danger" onClick={onCancel} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "예약 취소"}
        </Button>
      </>
    );
  } else if (isFull) {
    title = "예약 마감";
    body = (
      <>
        <p>이 시간대는 예약이 모두 마감되었습니다.</p>
        {bookedBy}
      </>
    );
    footer = (
      <Button variant="secondary" onClick={onHide}>
        닫기
      </Button>
    );
  } else {
    title = "새 예약";
    body = (
      <>
        <p>
          <strong>
            {lab} - {timeSlot.split(" ")[0]}
          </strong>
          에 예약하시겠습니까?
        </p>
        {bookedBy}
      </>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          닫기
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "예약하기"}
        </Button>
      </>
    );
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop={loading ? "static" : true}
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>{footer}</Modal.Footer>
    </Modal>
  );
};

export default App;
