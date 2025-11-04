import { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  children: ReactNode;
}

export function PageContainer({ title, children }: PageContainerProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
      {children}
    </div>
  );
}