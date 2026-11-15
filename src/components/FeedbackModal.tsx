import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, CheckCircle2, Mail, MessageSquare, AlignLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BorderBeam } from './ui/border-beam';
import { DiaTextReveal } from '@/registry/magicui/dia-text-reveal';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif';

export function FeedbackModalContent({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger side cannons confetti effect on submit
  const triggerSideCannons = () => {
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
        zIndex: 100001,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
        zIndex: 100001,
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !description.trim()) return;

    setIsSubmitting(true);

    try {
      const stored = JSON.parse(localStorage.getItem('cineverse_feedback') || '[]');
      stored.unshift({
        email: email.trim(),
        subject: subject.trim(),
        description: description.trim(),
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('cineverse_feedback', JSON.stringify(stored));
    } catch {}

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        subject: subject.trim(),
        description: description.trim()
      })
    }).catch(() => {});

    triggerSideCannons();

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 250);
  };

  return (
    <>
      <div
        style={{
          position: 'relative',
          maxHeight: 'min(92dvh, 92vh)',
          overflowY: 'auto',
          padding: 'clamp(16px, 4vw, 26px)',
          boxSizing: 'border-box',
          zIndex: 1,
          fontFamily: COMMON_FONT
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close feedback modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '38px',
            height: '38px',
            minWidth: '38px',
            minHeight: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#a3a3a3',
            cursor: 'pointer',
            zIndex: 30,
            touchAction: 'manipulation',
            transition: 'color 0.2s, background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a3a3a3';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={16} />
        </button>

        {submitted ? (
          <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', fontFamily: COMMON_FONT }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', margin: '0 0 6px', letterSpacing: '-0.01em', fontFamily: COMMON_FONT, textTransform: 'none' }}>
                Feedback sent successfully!
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#a3a3a3', margin: 0, maxWidth: '340px', fontFamily: COMMON_FONT }}>
                Thank you for helping us improve Cineverse. Your comments have been logged.
              </p>
            </div>

            {/* Submission preview */}
            <div style={{
              width: '100%',
              textAlign: 'left',
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#d4d4d4',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxSizing: 'border-box',
              fontFamily: COMMON_FONT
            }}>
              <div><strong style={{ color: '#ffffff' }}>Subject:</strong> {subject}</div>
              <div><strong style={{ color: '#a3a3a3' }}>From:</strong> {email}</div>
              <div style={{ paddingTop: '6px', borderTop: '1px solid #262626', color: '#b0b0b0', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: COMMON_FONT }}>
                {description}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: '6px',
                borderRadius: '8px',
                background: '#ffffff',
                padding: '9px 24px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#000000',
                border: 'none',
                cursor: 'pointer',
                fontFamily: COMMON_FONT,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: COMMON_FONT }}>
            {/* Header (Black & White, Common Font & Style) */}
            <div style={{ paddingRight: '32px' }}>
              <h2
                id="feedback-title"
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  margin: '0 0 4px',
                  letterSpacing: '-0.02em',
                  fontFamily: COMMON_FONT,
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35em',
                  flexWrap: 'wrap'
                }}
              >
                <span>Share your</span>
                <DiaTextReveal
                  repeat
                  repeatDelay={1.2}
                  text={["experience", "thoughts", "ideas"]}
                  style={{ fontWeight: 700 }}
                />
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#a3a3a3', margin: 0, fontFamily: COMMON_FONT }}>
                We appreciate your ideas, questions, and reports.
              </p>
            </div>

            {/* 1. Mail Address */}
            <div>
              <label htmlFor="feedback-email" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#e5e5e5', marginBottom: '6px', fontFamily: COMMON_FONT }}>
                <Mail size={13} color="#a3a3a3" />
                <span>Mail Address</span>
                <span style={{ color: '#737373' }}>*</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #2e2e2e',
                  background: '#141414',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: COMMON_FONT,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
              />
            </div>

            {/* 2. Subject */}
            <div>
              <label htmlFor="feedback-subject" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#e5e5e5', marginBottom: '6px', fontFamily: COMMON_FONT }}>
                <MessageSquare size={13} color="#a3a3a3" />
                <span>Subject</span>
                <span style={{ color: '#737373' }}>*</span>
              </label>
              <input
                id="feedback-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Recommendations, Movie request, Bug report"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #2e2e2e',
                  background: '#141414',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: COMMON_FONT,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
              />
            </div>

            {/* 3. Description */}
            <div>
              <label htmlFor="feedback-description" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#e5e5e5', marginBottom: '6px', fontFamily: COMMON_FONT }}>
                <AlignLeft size={13} color="#a3a3a3" />
                <span>Description</span>
                <span style={{ color: '#737373' }}>*</span>
              </label>
              <textarea
                id="feedback-description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write your feedback details here..."
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #2e2e2e',
                  background: '#141414',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: COMMON_FONT,
                  resize: 'none',
                  lineHeight: 1.5,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
              />
            </div>

            {/* Submit Button */}
            <div style={{ paddingTop: '4px' }}>
              <button
                id="feedback-submit-btn"
                type="submit"
                disabled={isSubmitting || !email.trim() || !subject.trim() || !description.trim()}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  padding: '11px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#000000',
                  border: '1px solid #ffffff',
                  cursor: isSubmitting || !email.trim() || !subject.trim() || !description.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !email.trim() || !subject.trim() || !description.trim() ? 0.5 : 1,
                  boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)',
                  fontFamily: COMMON_FONT,
                  transition: 'background-color 0.2s, opacity 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && email.trim() && subject.trim() && description.trim()) {
                    e.currentTarget.style.backgroundColor = '#e5e5e5';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={14} color="#000000" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'min(92dvh, 92vh)',
          borderRadius: '16px',
          border: '1px solid #2e2e2e',
          background: '#0a0a0a',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
          color: '#ffffff',
          fontFamily: COMMON_FONT,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <FeedbackModalContent onClose={onClose} />
        <BorderBeam duration={8} size={100} />
      </div>
    </div>,
    document.body
  );
}

export default FeedbackModal;
