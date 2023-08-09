import React, {useState} from 'react'

export default function Collapse({ collapsed, title, children }) {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);

    return (
    <>
        <button
            className="collapse-button flex"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{justifyContent: 'space-between', backgroundColor: isCollapsed ? '#7981da' : '#bec5ff'}}
        >
            {title}{isCollapsed ? 'Show' : 'Hide'}
        </button>

        <div
            className={`collapse-content ${isCollapsed ? 'collapsed' : 'expanded'}`}
            aria-expanded={isCollapsed}
            style={{padding: '0.3em', backgroundColor: '#e0e3ff'}}
        >
            {children}
        </div>
    </>
    )
}