/**
 * ============================================================================
 * TopBar.jsx
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Renders the top navigation bar containing the logo, title, and global actions.
 * 
 * SYSTEM ROLE:
 * Handles the "Auto Rotate" play/pause toggle and the "Export" screenshot trigger.
 * ============================================================================
 */
import React from 'react'
import './topbar.css'

export function TopBar({ title, autoRotate, setAutoRotate, onReset, onExport, onToggleFullScreen }) {
    return (
        <div className="top-bar">
            {/* Left: Branding & Title */}
            <div className="top-bar__left">
                <div className="top-brand">
                    <div className="top-brand__logo">
                        <div className="diamond-shape"></div>
                    </div>
                    <div className="top-brand__text">
                        <span className="brand-main">Aurum</span>
                        <span className="brand-sub">Studio 3D</span>
                    </div>
                </div>
                <div className="top-divider"></div>
                <span className="top-bar__title">{title}</span>
            </div>

            {/* Center: Play/Rotate Controls */}
            <div className="top-bar__center">
                <button
                    className={`nav-btn ${autoRotate ? 'nav-btn--active' : ''}`}
                    onClick={() => setAutoRotate(!autoRotate)}
                    title="Auto Rotate (Play/Pause)"
                >
                    {autoRotate ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Right: Actions */}
            <div className="top-bar__right">
                <button className="nav-btn nav-btn--secondary" onClick={onReset} title="Reset Camera & Settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    <span className="nav-btn__label">Reset</span>
                </button>
                <button className="nav-btn nav-btn--secondary" onClick={onToggleFullScreen} title="Toggle Fullscreen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2-2h3" />
                    </svg>
                    <span className="nav-btn__label">Fullscreen</span>
                </button>
                <button className="nav-btn nav-btn--primary" onClick={onExport} title="Render Image / Snapshot">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span className="nav-btn__label">Export</span>
                </button>
            </div>
        </div>
    )
}
