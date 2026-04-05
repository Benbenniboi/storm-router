import React, { useEffect, useRef } from 'react';
import { RouteResult, RouteStep } from '../types';

interface Props {
  route: RouteResult;
  currentStepIndex: number;
  distanceRemainingMiles: number;
  onClose: () => void;
}

export default function DirectionsPanel({ route, currentStepIndex, distanceRemainingMiles, onClose }: Props) {
  const stepListRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep current step visible
  useEffect(() => {
    currentStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentStepIndex]);

  const minsRemaining = Math.round(
    route.steps.slice(currentStepIndex).reduce((acc, s) => acc + s.durationSeconds, 0) / 60,
  );

  return (
    <div className="animate-slide-in absolute right-0 top-0 bottom-0 w-[340px] bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl overflow-hidden z-20">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-white font-bold text-sm">Turn-by-Turn</div>
          <div className="text-gray-400 text-xs mt-0.5">
            {distanceRemainingMiles.toFixed(1)} mi remaining · {minsRemaining} min
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Current step banner */}
      {route.steps[currentStepIndex] && (
        <div className="bg-blue-700 px-4 py-3 flex items-center gap-3">
          <ManeuverIcon step={route.steps[currentStepIndex]} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm leading-snug">
              {route.steps[currentStepIndex].instruction}
            </div>
            {route.steps[currentStepIndex].distanceMiles > 0.05 && (
              <div className="text-blue-200 text-xs mt-0.5">
                in {formatDist(route.steps[currentStepIndex].distanceMiles)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step list */}
      <div ref={stepListRef} className="flex-1 overflow-y-auto divide-y divide-gray-800">
        {route.steps.map((step, i) => {
          const isPast    = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          const isFuture  = i > currentStepIndex;

          return (
            <div
              key={i}
              ref={isCurrent ? currentStepRef : undefined}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isCurrent ? 'bg-blue-900/30' : isPast ? 'opacity-40' : ''
              }`}
            >
              <div className={`shrink-0 ${isFuture ? 'text-gray-400' : isCurrent ? 'text-blue-400' : 'text-gray-600'}`}>
                <ManeuverIcon step={step} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm leading-snug ${isCurrent ? 'text-white font-semibold' : isPast ? 'text-gray-500' : 'text-gray-300'}`}>
                  {step.instruction}
                </div>
                {step.streetName && step.streetName !== step.instruction && (
                  <div className="text-gray-500 text-xs mt-0.5 truncate">{step.streetName}</div>
                )}
              </div>
              <div className={`text-xs shrink-0 ${isCurrent ? 'text-blue-300' : 'text-gray-500'}`}>
                {step.distanceMiles > 0.05 ? formatDist(step.distanceMiles) : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 text-center">
        <div className="text-gray-500 text-xs">Route via OSRM · No paid APIs</div>
      </div>
    </div>
  );
}

function formatDist(miles: number): string {
  if (miles < 0.1) { return `${Math.round(miles * 5280)} ft`; }
  return `${miles.toFixed(1)} mi`;
}

function ManeuverIcon({ step, size }: { step: RouteStep; size: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  const { maneuverType, maneuverModifier } = step;

  // Map maneuver type + modifier to a rotation angle for the turn arrow
  if (maneuverType === 'depart' || maneuverType === 'arrive') {
    return (
      <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
        {maneuverType === 'arrive'
          ? <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          : <path d="M12 2l-5.5 9h11z"/>
        }
      </svg>
    );
  }

  const rotation = getArrowRotation(maneuverType, maneuverModifier);
  return (
    <svg
      className={cls}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d="M5 10l7-7m0 0l7 7m-7-7v18"/>
    </svg>
  );
}

function getArrowRotation(type: string, modifier?: string): number {
  if (type === 'continue' || type === 'new name') { return 0; }
  if (!modifier) { return 0; }
  const map: Record<string, number> = {
    'uturn':         180,
    'sharp left':    -135,
    'left':          -90,
    'slight left':   -45,
    'straight':      0,
    'slight right':  45,
    'right':         90,
    'sharp right':   135,
  };
  return map[modifier] ?? 0;
}
