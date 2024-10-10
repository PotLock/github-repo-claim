import { useState } from 'react';
import GitHub from '@/lib/utils/github';
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [fundingJson, setFundingJson] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (githubUrlRegex.test(repoUrl)) {
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
    } else {
      setError('Please enter a valid GitHub repository URL');
    }
  };

  const handleInputChange = (e) => {
    setRepoUrl(e.target.value);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>GitHub Repo Funding Checker</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={repoUrl}
            onChange={handleInputChange}
            placeholder="Enter GitHub repository URL"
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
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
