import React from 'react';
import styles from '@/styles/app.module.css';

export function SkeletonLoader({ rows = 1, columns = 6 }) {
  const skeletonContent = (
    <div className={styles.skeletonContent}></div>
  );

  const skeletonRow = (
    <div className={styles.skeletonRow}>
      {[...Array(columns)].map((_, index) => (
        <div key={index} className={styles.skeletonCell}>
          {skeletonContent}
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.skeletonContainer}>
      {[...Array(rows)].map((_, index) => (
        <React.Fragment key={index}>
          {skeletonRow}
        </React.Fragment>
      ))}
    </div>
  );
}
