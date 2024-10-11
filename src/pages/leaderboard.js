/**
 * To-Do
 * - Add a a route to each repo page when click the row
 * show NEAR address highlighted in the json
 */
import { useState, useEffect } from 'react';
import GitHub from '@/lib/utils/github';
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';
import repos from '../../data/repos.json';
import { FaGithub, FaStar, FaCodeBranch, FaSearch } from 'react-icons/fa';
import { SkeletonLoader } from '@/components/SkeletonLoader';

export default function Leaderboard() {
  const [repoData, setRepoData] = useState([]);
  const [sortBy, setSortBy] = useState('stars');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRepoData();
  }, []);

  const fetchRepoData = async () => {
    setIsLoading(true);
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const github = new GitHub(octokit);
      const repoPromises = repos.map(async (repoUrl) => {
        console.log(`Fetching data for repo: ${repoUrl}`);
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
          console.log(`FUNDING.json for ${repo.full_name}:`, fundingJson); // Debugging log
        } catch (error) {
          console.error(`Error fetching FUNDING.json for ${repo.full_name}:`, error);
        }
        return { ...repo, fundingJson };
      });
      const repoData = await Promise.all(repoPromises);
      console.log('All repo data fetched:', repoData);
      setRepoData(repoData);
    } catch (error) {
      console.error('Error fetching repo data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

    return fullName.includes(searchLower) || 
           orgName.includes(searchLower) || 
           nearAddress.includes(searchLower);
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
                <>
                  <tr key={repo.id}>
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
                        'N/A' // Ensure this is displayed correctly
                      )}
                    </td>
                    <td>
                      {(() => {
                        const potlockAddress = getPotlockNearAddress(repo.fundingJson);
                        console.log(`Potlock address for ${repo.full_name}:`, potlockAddress); // Debugging log
                        return potlockAddress ? (
                          <a
                            href={`https://alpha.potlock.org/profile/${potlockAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.tipButton}
                          >
                            Tip
                          </a>
                        ) : 'N/A'; // Ensure this is displayed correctly
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
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
