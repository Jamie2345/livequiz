window.addEventListener('beforeunload', function (e) {
    // Check if there are unsaved changes
    if (unsavedChangesExist()) {
        // Display a confirmation message
        var confirmationMessage = "You have unsaved changes. Are you sure you want to leave?";
        (e || window.event).returnValue = confirmationMessage; // Standard for most browsers
        return confirmationMessage; // For some older browsers
    }
});

function unsavedChangesExist() {
    // Implement your logic to check for unsaved changes
    // For example, you can compare current data with the original data
    // Return true if unsaved changes exist, otherwise return false
    // Replace the following line with your actual logic
    return true;
}

