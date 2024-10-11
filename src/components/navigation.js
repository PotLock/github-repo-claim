import Image from 'next/image';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { NearContext } from '@/wallets/near';

export const Navigation = () => {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [action, setAction] = useState(() => {});
  const [label, setLabel] = useState('Loading...');
  const router = useRouter();

  useEffect(() => {
    if (!wallet) return;

    if (signedAccountId) {
      setAction(() => wallet.signOut);
      setLabel(`Logout ${signedAccountId}`);
    } else {
      setAction(() => wallet.signIn);
      setLabel('Login');
    }
  }, [signedAccountId, wallet]);

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <Link href="/" passHref legacyBehavior>
          <a className="navbar-brand">🌱 repo.tips</a>
        </Link>
        <div className="navbar-nav">
          <Link href="/leaderboard" passHref legacyBehavior>
            <a className={`nav-link ${router.pathname === '/leaderboard' ? 'active' : ''}`}>
              Leaderboard
            </a>
          </Link>
          <button className="btn btn-secondary ms-2" onClick={action}>
            {label}
          </button>
        </div>
      </div>
    </nav>
  );
};
