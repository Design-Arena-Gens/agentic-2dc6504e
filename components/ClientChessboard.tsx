'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const DynamicChessboard = dynamic(() => import('react-chessboard').then((mod) => mod.Chessboard), {
  ssr: false,
}) as ComponentType<Record<string, unknown>>;

export default function ClientChessboard(props: Record<string, unknown>) {
  return <DynamicChessboard {...props} />;
}
