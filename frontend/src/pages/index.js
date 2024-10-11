import React, { useState, useCallback, useEffect } from 'react';
import GitHub, { validNEARAccount } from '@/lib/utils/github';
import { marked } from 'marked';
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';
import debounce from 'lodash/debounce';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { FaGithub, FaStar, FaCodeBranch, FaClipboardList, FaSearch } from 'react-icons/fa';

const EXAMPLE_REPO_URL = 'https://github.com/potlock/core';

export default function CombinedPage() {
  // States for the left column (index.js)
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [fundingJson, setFundingJson] = useState(null);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [nearAddress, setNearAddress] = useState('');
  const [nearAddressError, setNearAddressError] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);

  // States for the right column (leaderboard.js)
  const [repoData, setRepoData] = useState([]);
  const [sortBy, setSortBy] = useState('stars');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
        setRepoInfo(repo);

        const { data: commits } = await octokit.repos.listCommits({
          owner: repo.owner.login,
          repo: repo.name,
        });
        const commitCount = commits.length;

        const { data: readmeData } = await octokit.repos.getReadme({
          owner: repo.owner.login,
          repo: repo.name,
        });
        const readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');

        setRepoInfo({ ...repo, commitCount, readmeContent });
      } catch (error) {
        console.error('Error fetching repo data:', error.message);
        if (error.status === 404) {
          setError('Repository not found. Please check the URL and try again.');
        } else {
          setError(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = async (e) => {
    const url = e.target.value;
    setRepoUrl(url);
    validateUrl(url);
    if (isValidUrl) {
      await handleSubmit({ preventDefault: () => {} });
    }
  };

  const handleNearAddressChange = (e) => {
    const address = e.target.value;
    setNearAddress(address);
    if (!validNEARAccount(address)) {
      setNearAddressError('Invalid NEAR address format');
    } else {
      setNearAddressError('Valid');
    }
    if (address) {
      validateUrl(repoUrl);
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

  // Fetch repo data for the leaderboard
  useEffect(() => {
    const fetchRepoData = async () => {
      setIsLoading(true);
      try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const github = new GitHub(octokit);
        const repoPromises = repos.map(async (repoUrl) => {
          const repo = await github.getRepoByUrl(repoUrl);
          let fundingJson = null;
          try {
            await github.verifyFundingJson(repo.owner.login, repo.name);
            const { data } = await octokit.repos.getContent({
              owner: repo.owner.login,
              repo: repo.name,
              path: 'FUNDING.json',
            });
            fundingJson = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
          } catch (error) {
            console.error(`Error fetching FUNDING.json for ${repo.full_name}:`, error);
          }
          return { ...repo, fundingJson };
        });
        const repoData = await Promise.all(repoPromises);
        setRepoData(repoData);
      } catch (error) {
        console.error('Error fetching repo data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRepoData();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const getPotlockNearAddress = (fundingJson) => {
    if (fundingJson?.potlock?.near?.ownedBy) {
      return fundingJson.potlock.near.ownedBy;
    }
    return null;
  };

  const filteredRepos = repoData.filter((repo) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = repo.full_name.toLowerCase();
    const orgName = repo.owner.login.toLowerCase();
    const nearAddress = getPotlockNearAddress(repo.fundingJson)?.toLowerCase() || '';
    return fullName.includes(searchLower) || orgName.includes(searchLower) || nearAddress.includes(searchLower);
  });

  const sortedRepos = [...filteredRepos].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleExpandRepo = (repoId) => {
    setExpandedRepo(expandedRepo === repoId ? null : repoId);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <h1 className={styles.title}>GitHub Repo Funding Checker</h1>
          <div className={styles.devModeToggle}>
            <label>
              <input
                type="checkbox"
                checked={devMode}
                onChange={() => setDevMode(!devMode)}
              />
              Dev Mode
            </label>
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
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
          ) : repoInfo && !error ? (
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
              {nearAddressError && <p className={styles.error}>{nearAddressError}</p>}
              <a
                href={getGitHubProposalUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.button} ${nearAddressError ? styles.buttonGray : ''}`}
                style={{ pointerEvents: nearAddressError ? 'none' : 'auto' }}
              >
                Create FUNDING.json
              </a>
            </div>
          ) : null}
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
                    <span style={{ marginRight: '8px' }}>
                      <FaStar />
                      {repoInfo.stargazers_count}
                    </span>
                    <span style={{ marginRight: '8px' }}>
                      <FaCodeBranch />
                      {repoInfo.forks_count}
                    </span>
                    <span>
                      <FaClipboardList />
                      {repoInfo.commitCount}
                    </span>
                  </div>
                </div>
              </div>
              <hr />
              <button onClick={() => setIsReadmeOpen(!isReadmeOpen)} className={`${styles.toggleReadmeButton} ${isReadmeOpen ? styles.active : ''}`}>
                {isReadmeOpen ? 'Hide ReadMe' : 'Show Read Me'}
              </button>
              {isReadmeOpen && (
                <div className={styles.readmeContent}>
                  <div className={styles.readmeHeader}>README.md</div>
                  <div dangerouslySetInnerHTML={{ __html: marked(repoInfo.readmeContent) }} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          <h1>Repository Leaderboard</h1>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={handleSearch}
              className={styles.searchInput}
            />
          </div>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th onClick={() => handleSort('stargazers_count')} className={styles.sortable}>
                  <FaStar /> Stars {sortBy === 'stargazers_count' && (sortOrder === 'desc' ? '▼' : '▲')}
                </th>
                <th onClick={() => handleSort('forks_count')} className={styles.sortable}>
                  <FaCodeBranch /> Forks {sortBy === 'forks_count' && (sortOrder === 'desc' ? '▼' : '▲')}
                </th>
                <th>FUNDING.json</th>
                <th>Tip</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <SkeletonLoader />
                  <SkeletonLoader />
                  <SkeletonLoader />
                </>
              ) : (
                sortedRepos.map((repo, index) => (
                  <React.Fragment key={repo.id}>
                    <tr>
                      <td className={styles.rank}>
                        {index + 1}
                        {index === 0 && ' 🥇'}
                        {index === 1 && ' 🥈'}
                        {index === 2 && ' 🥉'}
                      </td>
                      <td>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.repoLink}
                        >
                          <FaGithub className={styles.githubIcon} />
                          {repo.full_name}
                        </a>
                      </td>
                      <td>{repo.stargazers_count}</td>
                      <td>{repo.forks_count}</td>
                      <td>
                        {repo.fundingJson ? (
                          <button onClick={() => toggleExpandRepo(repo.id)} className={styles.showButton}>
                            {expandedRepo === repo.id ? 'Hide' : 'Show'}
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>
                        {(() => {
                          const potlockAddress = getPotlockNearAddress(repo.fundingJson);
                          return potlockAddress ? (
                            <a
                              href={`https://alpha.potlock.org/profile/${potlockAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.tipButton}
                            >
                              Tip
                            </a>
                          ) : 'N/A';
                        })()}
                      </td>
                    </tr>
                    {expandedRepo === repo.id && (
                      <tr>
                        <td colSpan="6">
                          <pre className={styles.fundingJson}>
                            {JSON.stringify(repo.fundingJson, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}