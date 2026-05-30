import React from "react";
import "../styles/UnauthorizedModal.css";

interface UnauthorizedModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

const UnauthorizedModal: React.FC<UnauthorizedModalProps> = ({
  isOpen,
  message,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>⚠️ Unauthorized Access</h2>
        </div>
        {/* <div className="modal-body">
          <p>{message}</p>
        </div> */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-close">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedModal;
