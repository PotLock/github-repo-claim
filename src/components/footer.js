import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/app.module.css';
export const Footer = () => {

  const router = useRouter();

  return (
    <footer className={styles.footer}>
      <div className="container-fluid">
        built with ❤️ by <a className="navbar-brand" href="https://potlock.org" target="_blank">🫕 POTLOCK</a>
      </div>
    </footer>
  );
};
