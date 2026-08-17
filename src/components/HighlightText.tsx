import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
}

export default function HighlightText({ text, query }: HighlightTextProps) {
  if (!query) return <>{text}</>;
  
  // Escape regex special characters from the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} style={{ color: '#FCD34D', fontWeight: 'bold' }}>{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}
