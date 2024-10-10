import { useState } from 'react';
import Image from 'next/image';

import NearLogo from '/public/near.svg';
import NextLogo from '/public/next.svg';
import { Cards } from '@/components/cards';
import styles from '@/styles/app.module.css';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (githubUrlRegex.test(repoUrl)) {
      setError('');
      // Process the valid URL here
      console.log('Valid GitHub URL:', repoUrl);
    } else {
      setError('Please enter a valid GitHub repository URL');
    }
  };

  const handleInputChange = (e) => {
    setRepoUrl(e.target.value);
  };

  return (
    <main className={styles.main}>
      <div className={styles.description}> </div>

      <div className={styles.center}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={repoUrl}
            onChange={handleInputChange}
            placeholder="Enter GitHub repository URL"
            className={styles.input}
          />
          <button type="submit" className={styles.button}>Submit</button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.grid}>
      </div>
    </main>
  );
}
