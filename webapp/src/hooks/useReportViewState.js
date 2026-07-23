import { useState, useCallback } from 'react';

/**
 * Custom hook to manage collapse/expand state for the Report View
 * Manages state for sections (Uncategorized, Einnahme, Ausgabe) and their categories
 */
export const useReportViewState = () => {
  // State for section-level collapse (uncategorized, einnahme, ausgabe)
  const [collapsedSections, setCollapsedSections] = useState({
    uncategorized: false,
    einnahme: false,
    ausgabe: false,
  });

  // State for category-level collapse within each section
  // Format: { 'uncategorized:CategoryName': true/false, 'einnahme:CategoryName': true/false }
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Toggle a section's collapse state
  const toggleSection = useCallback((section) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Toggle a category's collapse state
  const toggleCategory = useCallback((section, categoryName) => {
    const key = `${section}:${categoryName}`;
    setCollapsedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Check if a section is collapsed
  const isSectionCollapsed = useCallback(
    (section) => {
      return collapsedSections[section] || false;
    },
    [collapsedSections]
  );

  // Check if a category is collapsed
  const isCategoryCollapsed = useCallback(
    (section, categoryName) => {
      const key = `${section}:${categoryName}`;
      return collapsedCategories[key] || false;
    },
    [collapsedCategories]
  );

  // Collapse all sections
  const collapseAll = useCallback(() => {
    setCollapsedSections({
      uncategorized: true,
      einnahme: true,
      ausgabe: true,
    });
  }, []);

  // Expand all sections
  const expandAll = useCallback(() => {
    setCollapsedSections({
      uncategorized: false,
      einnahme: false,
      ausgabe: false,
    });
    // Also expand all categories
    setCollapsedCategories({});
  }, []);

  return {
    toggleSection,
    toggleCategory,
    isSectionCollapsed,
    isCategoryCollapsed,
    collapseAll,
    expandAll,
  };
};
