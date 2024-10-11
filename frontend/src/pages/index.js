import React, { useState, useCallback, useEffect } from 'react';
import GitHub, {validNEARAccount, getRepoByOwnerAndName, getRepoByUrl }  from '@/lib/utils/github';
import { marked } from 'marked'; // Add this import
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';
import debounce from 'lodash/debounce';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { FaGithub, FaStar, FaCodeBranch, FaClipboardList } from 'react-icons/fa'; // Import relevant icons

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
  const [repoInfo, setRepoInfo] = useState(null); // New state for repository information
  const [isReadmeOpen, setIsReadmeOpen] = useState(false); // State for toggling README visibility

  const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;

  // add this to github utils
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
        setRepoInfo(repo); // Set the repository information

        // Fetch the number of commits
        const { data: commits } = await octokit.repos.listCommits({
          owner: repo.owner.login,
          repo: repo.name,
        });
        const commitCount = commits.length; // Get the number of commits

        // Fetch the README if it exists
        const { data: readmeData } = await octokit.repos.getReadme({
          owner: repo.owner.login,
          repo: repo.name,
        });
        const readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8'); // Decode README content

        // Set the fetched data
        setRepoInfo({ ...repo, commitCount, readmeContent }); // Include commit count and README content
      } catch (error) {
        console.error('Error fetching repo data:', error.message);
        // New error handling for non-existent repo
        if (error.status === 404) {
          setError('Repository not found. Please check the URL and try again.'); // Set specific error message
        } else {
          setError(error.message);
        }
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
      setNearAddressError('Valid'); // Clear error message if valid
    }
    
    // Recheck validity after nearAddress changes
    if (address) {
      validateUrl(repoUrl); // Optionally recheck repoUrl validity if needed
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

  const handleInputChange = async (e) => {
    const url = e.target.value;
    setRepoUrl(url);
    validateUrl(url); // Recheck validity after repoUrl changes

    // Automatically check if the URL is valid and fetch repo info
    if (isValidUrl) {
        await handleSubmit({ preventDefault: () => {} }); // Automatically trigger handleSubmit
    }
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
        <form className={styles.form}> {/* Removed onSubmit from form */}
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
          {/* Removed Check Funding button */}
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
        ) : repoInfo && !error ? ( // Check if repoInfo is not null
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

        {/* New section to display repository information */}
        {repoInfo && (
          <div className={styles.repoCard}>
            <div className={styles.repoHeader}>
              <img src={repoInfo.owner.avatar_url} alt={`${repoInfo.owner.login}'s avatar`} className={styles.repoAvatar} />
              <div>
                <h2>
                  <a href={repoInfo.html_url} target="_blank" rel="noopener noreferrer">{repoInfo.full_name}</a>
                </h2>
                <p className={styles.repoDescription}>{repoInfo.description}</p>
                <div className={styles.repoStats}>
                  <span style={{ marginRight: '8px' }}> {/* Add margin to the right for spacing */}
                    <FaStar /> {/* Star icon */}
                    {repoInfo.stargazers_count}
                  </span>
                  <span style={{ marginRight: '8px' }}> {/* Add margin to the right for spacing */}
                    <FaCodeBranch /> {/* Fork icon */}
                    {repoInfo.forks_count}
                  </span>
                  <span>
                    <FaClipboardList /> {/* Commit icon */}
                    {repoInfo.commitCount}
                  </span>
                </div>
              </div>
            </div>
            <hr /> {/* Line divider */}
            <button onClick={() => setIsReadmeOpen(!isReadmeOpen)} className={`${styles.toggleReadmeButton} ${isReadmeOpen ? styles.active : ''}`}>
              {isReadmeOpen ? 'Hide ReadMe' : 'Show Read Me'}
            </button>
            {isReadmeOpen && (
              <div className={styles.readmeContent}>
                <div className={styles.readmeHeader}>README.md</div>
                <div dangerouslySetInnerHTML={{ __html: marked(repoInfo.readmeContent) }} /> {/* Render README with markdown support */}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}