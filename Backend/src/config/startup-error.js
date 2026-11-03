function startupError(error) {
  switch (error.code) {
    case 'ER_ACCESS_DENIED_ERROR':
      return 'MySQL rejected the login. Set DB_USER and DB_PASSWORD in Backend/.env to a valid MySQL account.';
    case 'ER_DBACCESS_DENIED_ERROR':
    case 'ER_TABLEACCESS_DENIED_ERROR':
    case 'ER_SPECIFIC_ACCESS_DENIED_ERROR':
      return 'The MySQL account lacks database permissions. Ask your database administrator to grant access to DB_NAME.';
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
    case 'ENOTFOUND':
      return 'Cannot reach MySQL. Start MySQL and check DB_HOST and DB_PORT in Backend/.env.';
    case 'ER_BAD_DB_ERROR':
    case 'ER_NO_SUCH_TABLE':
      return 'Database setup is missing. Run npm run setup:db --prefix Backend.';
    case 'ER_BAD_FIELD_ERROR':
      return 'The existing users table is incompatible. Review its schema before applying an additive migration.';
    case 'EADDRINUSE':
      return 'The backend port is already in use. Stop the other process or change PORT in Backend/.env.';
    case 'EACCES':
    case 'EPERM':
      return 'Permission denied. Check permission to open the configured port or access MySQL.';
    default:
      // Configuration errors originate in our validators; never print raw MySQL errors or credentials.
      if (!error.code && /^(Set |Replace |DB_PORT |PORT |JWT_EXPIRES_IN )/.test(error.message)) return error.message;
      return 'Check backend configuration and database schema. Error code: ' + (error.code || 'CONFIGURATION_ERROR');
  }
}
module.exports = { startupError };
