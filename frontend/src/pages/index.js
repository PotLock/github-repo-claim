import { useState, useCallback } from 'react';
import GitHub from '@/lib/utils/github';
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';
import debounce from 'lodash/debounce';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [fundingJson, setFundingJson] = useState(null);
  const [isValidUrl, setIsValidUrl] = useState(true);

  const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;

  const validateUrl = useCallback(
    debounce((url) => {
      setIsValidUrl(githubUrlRegex.test(url));
      setError(url && !githubUrlRegex.test(url) ? 'Please enter a valid GitHub repository URL' : '');
    }, 300),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isValidUrl) {
      setError('');
      try {
        const octokit = new Octokit();
        const github = new GitHub(octokit);
        const repo = await github.getRepoByUrl(repoUrl);
        await github.verifyFundingJson(repo.owner.login, repo.name);
        
        // Fetch FUNDING.json content
        const { data } = await octokit.repos.getContent({
          owner: repo.owner.login,
          repo: repo.name,
          path: 'FUNDING.json',
        });
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        setFundingJson(JSON.parse(content));
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleInputChange = (e) => {
    const url = e.target.value;
    setRepoUrl(url);
    validateUrl(url);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>GitHub Repo Funding Checker</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={repoUrl}
              onChange={handleInputChange}
              placeholder="Enter GitHub repository URL"
              className={`${styles.input} ${!isValidUrl && repoUrl ? styles.inputError : ''}`}
            />
            {!isValidUrl && repoUrl && (
              <span className={styles.errorIcon} title="Invalid URL">
                ⚠️
              </span>
            )}
          </div>
          <button type="submit" className={styles.button} disabled={!isValidUrl || !repoUrl}>
            Check Funding
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        {fundingJson && (
          <div className={styles.result}>
            <h2>FUNDING.json Content:</h2>
            <pre>{JSON.stringify(fundingJson, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
