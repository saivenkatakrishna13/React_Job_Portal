import React from "react";

const ResumeModal = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-xl font-bold shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          &times;
        </button>
        <img
          src={imageUrl}
          alt="resume"
          className="max-h-[85vh] max-w-full object-contain rounded-lg"
        />
      </div>
    </div>
  );
};

export default ResumeModal;