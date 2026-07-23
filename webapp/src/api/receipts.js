import { get, del, postMultipart, getAccessToken } from './client';
import { getConfig } from '../config';

/**
 * Build URL for receipt download (needs manual fetch for blob handling)
 */
function buildReceiptUrl(transactionId) {
    const config = getConfig();
    const baseUrl = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl.slice(0, -1) : config.apiBaseUrl;
    return `${baseUrl}/transactions/${transactionId}/receipt`;
}

// Upload a receipt for a transaction
const uploadReceipt = async (transactionId, file) => {
    console.log(`Uploading receipt for transaction ${transactionId}: ${file.name} (${file.type}, ${file.size} bytes)`);
    const formData = new FormData();
    formData.append('file', file);

    const uploadResult = await postMultipart(
        `/transactions/${transactionId}/receipt`,
        formData,
        'Failed to upload receipt'
    );

    console.log(`Upload result for transaction ${transactionId}:`, uploadResult);

    return uploadResult;
};

// Download a receipt for a transaction
// Note: This needs special handling for blob download, so we use fetch directly
// but we still need to handle JWT manually
const downloadReceipt = async (transactionId) => {
    const url = buildReceiptUrl(transactionId);

    // Add JWT token to headers
    const headers = {};
    const token = getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error('Failed to download receipt');
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');

    // Extract filename from content-disposition header
    let filename = 'receipt';
    if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }

    return { blob, contentType, filename };
};

// Duplicate a receipt from one transaction to another
const duplicateReceipt = async (sourceTransactionId, targetTransactionId) => {
    console.log(`Duplicating receipt from ${sourceTransactionId} to ${targetTransactionId}`);
    // We need to call 'uploadReceipt' with the blob from source transaction
    const metadata = await getReceiptMetadata(sourceTransactionId);

    if (metadata.hasReceipt) {
        console.log(`Source transaction ${sourceTransactionId} has receipt:`, metadata);
        const { blob } = await downloadReceipt(sourceTransactionId);
        console.log(`Downloaded receipt blob from source transaction ${sourceTransactionId}:`, blob);
        const file = new File([blob], metadata.receipt.fileName, { type: metadata.receipt.contentType });
        console.log(`Uploading duplicated receipt to target transaction ${targetTransactionId}`);
        const result = await uploadReceipt(targetTransactionId, file);
        console.log(`Upload result for duplicated receipt to transaction ${targetTransactionId}:`, result);
    }

};

const deleteReceipt = (transactionId) =>
    del(`/transactions/${transactionId}/receipt`, 'Failed to delete receipt');

const getReceiptMetadata = (transactionId) =>
    get(`/transactions/${transactionId}/receipt/metadata`, 'Failed to fetch receipt metadata');

export const receiptsApi = {
    uploadReceipt,
    downloadReceipt,
    duplicateReceipt,
    // Delete a receipt for a transaction
    deleteReceipt,
    // Get receipt metadata for a transaction
    getReceiptMetadata
};
