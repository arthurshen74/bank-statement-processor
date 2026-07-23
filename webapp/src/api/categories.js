import { createApiClient } from './client';

const client = createApiClient('/categories');

export const categoriesApi = {
    getAllCategories: () => client.getAll('Failed to fetch categories'),
    getCategoryById: (id) => client.getById(id, 'Failed to fetch category'),
    createCategory: (category) => client.create(category, 'Failed to create category'),
    updateCategory: (id, category) => client.update(id, category, 'Failed to update category'),
    deleteCategory: (id) => client.delete(id, 'Failed to delete category')
};
