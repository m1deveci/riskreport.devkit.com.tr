import Swal from 'sweetalert2';

// Toast notification (quick messages)
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Success toast
export const showSuccess = (message: string) => {
  return Toast.fire({
    icon: 'success',
    title: message
  });
};

// Error toast
export const showError = (message: string) => {
  return Toast.fire({
    icon: 'error',
    title: message
  });
};

// Warning toast
export const showWarning = (message: string) => {
  return Toast.fire({
    icon: 'warning',
    title: message
  });
};

// Info toast
export const showInfo = (message: string) => {
  return Toast.fire({
    icon: 'info',
    title: message
  });
};

// Confirm delete dialog
export const confirmDelete = async (itemName: string = 'bu öğeyi'): Promise<boolean> => {
  const result = await Swal.fire({
    title: 'Emin misiniz?',
    text: `${itemName} silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Evet, Sil!',
    cancelButtonText: 'İptal',
    reverseButtons: true
  });
  return result.isConfirmed;
};

// Confirm action dialog
export const confirmAction = async (title: string, text: string): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Evet',
    cancelButtonText: 'İptal',
    reverseButtons: true
  });
  return result.isConfirmed;
};

// Success modal (for important operations)
export const showSuccessModal = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Tamam'
  });
};

// Error modal (for important errors)
export const showErrorModal = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#d33',
    confirmButtonText: 'Tamam'
  });
};

// Loading state
export const showLoading = (title: string = 'Lütfen bekleyin...') => {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

// Close loading
export const closeLoading = () => {
  Swal.close();
};

// SMTP Test result
export const showSmtpTestResult = (success: boolean, message: string) => {
  return Swal.fire({
    title: success ? 'SMTP Bağlantısı Başarılı!' : 'SMTP Bağlantısı Başarısız!',
    text: message,
    icon: success ? 'success' : 'error',
    confirmButtonColor: success ? '#3085d6' : '#d33',
    confirmButtonText: 'Tamam'
  });
};

export default Swal;
