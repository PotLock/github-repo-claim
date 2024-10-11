import { useState, useCallback, useEffect } from 'react';
import GitHub, { validNEARAccount } from '@/lib/utils/github'; // Import validNEARAccount
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';
import debounce from 'lodash/debounce';
import { SkeletonLoader } from '@/components/SkeletonLoader';

const EXAMPLE_REPO_URL = 'https://github.com/potlock/core'; // Define the example repo variable

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [fundingJson, setFundingJson] = useState(null);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [nearAddress, setNearAddress] = useState('');
  const [nearAddressError, setNearAddressError] = useState(''); // New state for NEAR address error

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
      setIsLoading(true);
      try {
        const octokit = new Octokit();
        const github = new GitHub(octokit);
        const repo = await github.getRepoByUrl(repoUrl);
        console.log('Default branch:', repo.defaultBranch);
        setDefaultBranch(repo.defaultBranch || 'main');
        console.log('Set default branch to:', repo.defaultBranch || 'main');
        
        let fundingJson = null;
        try {
          await github.verifyFundingJson(repo.owner.login, repo.name);
          
          // Fetch FUNDING.json content
          const { data } = await octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: 'FUNDING.json',
          });
          fundingJson = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
          console.log(`FUNDING.json for ${repo.full_name}:`, fundingJson);
          setFundingJson(fundingJson);
        } catch (error) {
          console.log('FUNDING.json not found');
          setFundingJson(null);
        }
      } catch (error) {
        console.error('Error fetching repo data:', error.message);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNearAddressChange = (e) => {
    const address = e.target.value;
    setNearAddress(address);
    
    // Validate NEAR address
    if (!validNEARAccount(address)) { // Use the imported function to validate
      setNearAddressError('Invalid NEAR address format'); // Set error message
    } else {
      setNearAddressError(''); // Clear error message if valid
    }
  };

  const getGitHubProposalUrl = () => {
    const fundingJsonContent = JSON.stringify({
      potlock: {
        near: {
          ownedBy: nearAddress
        }
      }
    }, null, 2);

    return `${repoUrl}/new/${defaultBranch}?filename=FUNDING.json&value=${encodeURIComponent(fundingJsonContent)}`;
  };

  const handleInputChange = (e) => {
    const url = e.target.value;
    setRepoUrl(url);
    validateUrl(url);
  };

  const handleDevModeToggle = () => {
    setDevMode(!devMode);
    if (!devMode) {
      setRepoUrl(EXAMPLE_REPO_URL); // Use the example repo variable
      validateUrl(EXAMPLE_REPO_URL);
      handleSubmit({ preventDefault: () => {} }); // Automatically trigger Check Funding
    } else {
      setRepoUrl('');
      validateUrl('');
    }
  };

  useEffect(() => {
    setDefaultBranch('main');
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>GitHub Repo Funding Checker</h1>
        <div className={styles.devModeToggle}>
          <label>
            <input
              type="checkbox"
              checked={devMode}
              onChange={handleDevModeToggle}
            />
            Dev Mode
          </label>
        </div>
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
        {isLoading ? (
          <div className={styles.result}>
            <h2>Loading...</h2>
            <SkeletonLoader />
          </div>
        ) : fundingJson ? (
          <div className={styles.result}>
            <h2>FUNDING.json Content:</h2>
            <pre>{JSON.stringify(fundingJson, null, 2)}</pre>
          </div>
        ) : repoUrl && !error ? (
          <div className={styles.result}>
            <h2>No FUNDING.json found</h2>
            <p>Would you like to create one?</p>
            <input
              type="text"
              value={nearAddress}
              onChange={handleNearAddressChange}
              placeholder="Enter NEAR address"
              className={styles.input}
            />
            {nearAddressError && <p className={styles.error}>{nearAddressError}</p>} {/* Show error message */}
            <a
              href={getGitHubProposalUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.button} ${nearAddressError ? styles.buttonGray : ''}`} // Gray out if error
              style={{ pointerEvents: nearAddressError ? 'none' : 'auto' }} // Disable link if error
            >
              Create FUNDING.json
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
