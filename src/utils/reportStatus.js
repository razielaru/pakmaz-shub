export function getGpsStatusKey(report, assessment) {
  const raw = report?.gps_status

  if (raw === 'matched' || raw === 'review' || raw === 'suspicious') {
    return raw
  }

  if (raw === 'תואם') return 'matched'
  if (raw === 'דורש בדיקה') return 'review'
  if (raw === 'חשוד') return 'suspicious'

  if (!assessment) return 'review'
  if (assessment.level === 'danger') return 'suspicious'
  if (assessment.level === 'warning' || assessment.level === 'uncertain') return 'review'
  return 'matched'
}

export function getGpsStatusMeta(statusKey) {
  switch (statusKey) {
    case 'matched':
      return {
        key: 'matched',
        label: 'תואם',
        shortLabel: 'תואם',
        className: 'status-ok',
        bg: '#dcfce7',
        color: '#166534',
      }
    case 'suspicious':
      return {
        key: 'suspicious',
        label: 'חשוד',
        shortLabel: 'חשוד',
        className: 'status-fail',
        bg: '#fee2e2',
        color: '#991b1b',
      }
    default:
      return {
        key: 'review',
        label: 'דורש בדיקה',
        shortLabel: 'בדיקה',
        className: 'status-warn',
        bg: '#fef3c7',
        color: '#92400e',
      }
  }
}
