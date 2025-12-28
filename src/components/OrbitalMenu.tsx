'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { HomeIcon, DocIcon, UserIcon, ContactIcon, CogIcon, PenIcon, ShieldCheckIcon, GlobeIcon } from './Icons';
import { WindowType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
    id: WindowType;
    label: string;
    icon: React.FC;
}

interface OrbitalMenuProps {
    openWindow: (type: WindowType, data?: any) => void;
}

export const OrbitalMenu: React.FC<OrbitalMenuProps> = ({ openWindow }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const [radius, setRadius] = useState(170);
    const { profile } = useAuth();

    const menuItems = useMemo(() => {
        const items: NavItem[] = [
            { id: 'home', label: 'home', icon: HomeIcon },
            { id: 'wim', label: 'write for wim', icon: PenIcon },
        ];

        // Admin check
        if (profile?.role === 'admin') {
            items.push({ id: 'admin', label: 'admin', icon: ShieldCheckIcon });
        }

        // Standard items
        items.push({ id: 'about', label: 'about', icon: GlobeIcon });
        items.push({ id: 'contact', label: 'contact', icon: ContactIcon });

        // Auth dependant item
        if (profile) {
            items.push({ id: 'settings', label: 'system', icon: CogIcon });
        } else {
            items.push({ id: 'login', label: 'login', icon: UserIcon });
        }

        // Legal (using Privacy as entry point)
        items.push({ id: 'privacy', label: 'legal pages', icon: DocIcon });

        return items;
    }, [profile]);

    useEffect(() => {
        // Handle Responsive Radius
        const handleResize = () => {
            if (window.innerWidth < 640) {
                setRadius(150); // Larger on mobile (was 140)
            } else {
                setRadius(180); // Standard desktop
            }
        };

        // Initial check
        handleResize();
        window.addEventListener('resize', handleResize);

        // Active rotation loop
        let frameId: number;
        const animate = () => {
            setRotation(prev => prev + 0.15);
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const totalItems = menuItems.length;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">

            {/* Visual Orbit Ring - Dynamic Size */}
            <div
                className="absolute border border-slate-300 dark:border-white/20 rounded-full opacity-60 transition-all duration-500"
                style={{ width: radius * 2, height: radius * 2 }}
            />
            <div
                className="absolute border border-dashed border-slate-300 dark:border-white/10 rounded-full opacity-40 animate-[spin_60s_linear_infinite] transition-all duration-500"
                style={{ width: radius * 2 + 40, height: radius * 2 + 40 }}
            />

            {menuItems.map((item, index) => {
                const offsetAngle = (360 / totalItems) * index;
                const currentAngle = (rotation + offsetAngle) % 360;
                const radian = (currentAngle * Math.PI) / 180;

                const x = Math.cos(radian) * radius;
                const y = Math.sin(radian) * radius;

                const isHovered = hoveredId === item.id;
                const IconComponent = item.icon;

                return (
                    <button
                        key={item.id}
                        onClick={() => openWindow(item.id)}
                        className={`absolute group flex items-center justify-center pointer-events-auto transition-transform duration-100 ease-linear`}
                        style={{
                            transform: `translate(${x}px, ${y}px)`,
                            zIndex: 10
                        }}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                        <div className={`
              relative flex flex-col items-center justify-center
              transition-all duration-300
              ${isHovered ? 'scale-110' : 'scale-100'}
            `}>
                            {/* Icon Container (No background, No shadow) */}
                            <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 
                    flex items-center justify-center
                    transition-all duration-300
                `}>
                                <div className={`transition-colors duration-300 scale-[1.2] ${isHovered ? 'text-black dark:text-white' : 'text-black dark:text-white'}`}>
                                    <IconComponent />
                                </div>
                            </div>

                            {/* Label */}
                            <span className={`
                    absolute top-full mt-1 text-[10px] font-bold tracking-widest lowercase
                    text-black dark:text-white
                    transition-all duration-200 whitespace-nowrap
                    ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                `}>
                                {item.label}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
