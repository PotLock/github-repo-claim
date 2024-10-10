import '@/styles/globals.css';
import styles from '@/styles/app.module.css';
import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { NetworkId } from '@/config';
import { NearContext, Wallet } from '@/wallets/near';
import { SkeletonLoader } from '@/components/SkeletonLoader';

const wallet = new Wallet({ networkId: NetworkId });

export default function MyApp({ Component, pageProps }) {
  const [signedAccountId, setSignedAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initWallet = async () => {
      await wallet.startUp(setSignedAccountId);
      setIsLoading(false);
    };
    initWallet();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <h1>Loading...</h1>
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <NearContext.Provider value={{ wallet, signedAccountId }}>
      <Navigation />
      <Component {...pageProps} />
    </NearContext.Provider>
  );
}
