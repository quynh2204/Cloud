import { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="p-8">
      {children}
    </div>
  );
}
