import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { generateTimeSlots, MAX_RESERVATIONS_PER_SLOT } from "./constants";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

const Timetable = ({
  studentId,
  studentName,
  authNumber,
  selectedLab,
  selectedDate,
  reservations,
  currentReservationCount,
  onReservationUpdate,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  const timeSlots = generateTimeSlots();

  const handleCardClick = (timeSlot) => {
    // 예약 제한에 도달했고, 해당 시간대에 내 예약이 없는 경우 클릭 방지
    const reservationsForSlot = reservations.filter(
      (r) => r.time_slot === timeSlot
    );
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );

    if (currentReservationCount >= 2 && !isMyReservation) {
      toast.warning("예약은 최대 2회까지만 가능합니다.");
      return;
    }

    setSelectedTimeSlot(timeSlot);
    setShowModal(true);
  };

  const handleCloseModal = (force = false) => {
    if (loading && !force) return; // Don't close modal while loading unless forced
    setShowModal(false);
    setSelectedTimeSlot(null);
  };

  const handleConfirmReservation = async () => {
    if (!studentId || !authNumber) {
      toast.error("학번과 인증번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // Server-side double check for the reservation count.
      const { count, error: countError } = await supabase
        .from("reservations")
        .select("id", { head: true, count: 'exact' })
        .eq("student_id", studentId);

      if (countError) {
        console.error("Error checking existing reservations:", countError);
        toast.error("예약 확인 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (count >= 2) {
        toast.error("예약은 최대 2회까지만 가능합니다.");
        setLoading(false);
        return;
      }

      // 예약 데이터 생성 (필수 필드만)
      const reservationData = {
        time_slot: selectedTimeSlot,
        student_id: studentId,
        student_name: studentName,
        auth_number: authNumber,
        date: selectedDate,
        lab_id: selectedLab,
      };

      console.log("Creating reservation with data:", reservationData);

      // 예약 생성
      const { data: insertData, error } = await supabase
        .from("reservations")
        .insert([reservationData])
        .select();

      if (error) {
        console.error("Error creating reservation:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        if (error.code === "23505") {
          toast.error("이미 이 시간대에 예약하셨습니다.");
        } else {
          const details = error.message || "오류가 발생했습니다.";
          toast.error(`예약에 실패했습니다: ${details}`);
        }
      } else {
        console.log("Reservation created successfully:", insertData);
        toast.success("예약이 완료되었습니다. 예약한 시간에 방문해주세요.");
        onReservationUpdate(); // Notify App.js to refetch all data
      }
    } finally {
      setLoading(false);
      handleCloseModal(true);
    }
  };

  const handleCancelReservation = async () => {
    const MASTER_AUTH_NUMBER = process.env.REACT_APP_MASTER_AUTH_NUMBER;

    if (!studentId || !authNumber) {
      toast.error("학번과 인증번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 먼저 해당 시간대의 예약을 찾고 인증번호를 확인
      const { data: reservationData, error: fetchError } = await supabase
        .from("reservations")
        .select("id, student_id, auth_number")
        .eq("time_slot", selectedTimeSlot)
        .eq("date", selectedDate)
        .eq("lab_id", selectedLab)
        .eq("student_id", studentId)
        .single();

      if (fetchError || !reservationData) {
        toast.error("취소할 예약 정보를 찾을 수 없습니다.");
        return;
      }

      // 인증번호 검증 (마스터 인증번호가 아닌 경우)
      if (
        authNumber !== MASTER_AUTH_NUMBER &&
        reservationData.auth_number !== authNumber
      ) {
        toast.error("인증번호가 일치하지 않습니다.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("reservations")
        .delete()
        .match({ id: reservationData.id });

      if (deleteError) {
        console.error("Error canceling reservation:", deleteError);
        toast.error("예약 취소에 실패했습니다.");
      } else {
        toast.success(
          `${selectedLab} ${selectedTimeSlot} 예약이 취소되었습니다.`
        );
        onReservationUpdate(); // Notify App.js to refetch all data
      }
    } finally {
      setLoading(false);
      handleCloseModal(true);
    }
  };

  const renderModalContent = () => {
    if (!selectedTimeSlot) return null;

    const reservationsForSlot = reservations.filter(
      (r) => r.time_slot === selectedTimeSlot
    );
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );
    const isFull = reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT;
    const isReservationLimitReached = currentReservationCount >= 2;

    let modalBody, modalFooter;

    if (isMyReservation) {
      modalBody = (
        <p>학번과 인증번호를 입력 후, 아래 버튼을 눌러 예약을 취소하세요.</p>
      );
      modalFooter = (
        <>
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={loading}
          >
            닫기
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelReservation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">취소 중...</span>
              </>
            ) : (
              "예약 취소하기"
            )}
          </Button>
        </>
      );
    } else if (isFull) {
      modalBody = (
        <>
          <p>이 시간대는 예약이 모두 마감되었습니다.</p>
          <p>
            <strong>예약자:</strong>{" "}
            {reservationsForSlot
              .map((r) => formatReservationDisplay(r))
              .join(", ")}
          </p>
        </>
      );
      modalFooter = (
        <Button variant="secondary" onClick={handleCloseModal}>
          닫기
        </Button>
      );
    } else if (isReservationLimitReached) {
      modalBody = (
        <>
          <p>예약은 최대 2회까지만 가능합니다.</p>
          <div className="alert alert-warning mt-3">
            <small>
              <strong>예약 제한:</strong> 한 학번당 전체 기간 중 최대 2회까지 예약
              가능합니다.
            </small>
          </div>
        </>
      );
      modalFooter = (
        <Button variant="secondary" onClick={handleCloseModal}>
          닫기
        </Button>
      );
    } else {
      modalBody = (
        <>
          <p>{selectedTimeSlot}에 예약하시겠습니까?</p>
          {reservationsForSlot.length > 0 && (
            <p>
              <strong>현재 예약자:</strong>{" "}
              {reservationsForSlot
                .map((r) => formatReservationDisplay(r))
                .join(", ")}
            </p>
          )}
          <div className="alert alert-info mt-3">
            <small>
              <strong>예약 제한 안내:</strong> 한 학번당 전체 기간 중 최대 2회까지
              예약 가능합니다.
            </small>
          </div>
        </>
      );
      modalFooter = (
        <>
          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={loading}
          >
            닫기
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmReservation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">예약 중...</span>
              </>
            ) : (
              "예약하기"
            )}
          </Button>
        </>
      );
    }

    return (
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        backdrop={loading ? "static" : true}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedLab} - {selectedTimeSlot}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalBody}</Modal.Body>
        <Modal.Footer>{modalFooter}</Modal.Footer>
      </Modal>
    );
  };

  const getCardClass = (reservationsForSlot) => {
    const isMyReservation = reservationsForSlot.some(
      (r) => r.student_id === studentId
    );
    if (isMyReservation) return "bg-success"; // My reservation
    if (reservationsForSlot.length >= MAX_RESERVATIONS_PER_SLOT)
      return "bg-danger"; // Full
    if (currentReservationCount >= 2 && !isMyReservation) return "bg-secondary"; // Reservation limit reached
    if (reservationsForSlot.length > 0) return "bg-warning"; // Partially reserved
    return "bg-light"; // Available
  };

  const formatReservationDisplay = (reservation) => {
    const id = reservation.student_id || "";
    const name = reservation.student_name || "";
    return `${id} ${name}`.trim();
  };

  return (
    <div>
      <h2 className="text-center my-4">{selectedLab} 예약 현황</h2>
      <div className="row row-cols-1 row-cols-sm-1 row-cols-md-2 row-cols-lg-3 g-3">
        {timeSlots.map((timeSlot) => {
          const reservationsForSlot = reservations.filter(
            (r) => r.time_slot === timeSlot
          );

          return (
            <div key={timeSlot} className="col">
              <div
                className={`card text-center h-100 ${getCardClass(
                  reservationsForSlot
                )}`}
                onClick={() => handleCardClick(timeSlot)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-body d-flex flex-column justify-content-center">
                  <h5 className="card-title mb-1">{timeSlot}</h5>
                  <p className="card-text small text-truncate">
                    {reservationsForSlot
                      .map((r) => formatReservationDisplay(r))
                      .join(", ") || "예약 가능"}
                  </p>
                  <p className="card-text small">
                    ({reservationsForSlot.length}/{MAX_RESERVATIONS_PER_SLOT})
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {renderModalContent()}
    </div>
  );
};

export default Timetable;