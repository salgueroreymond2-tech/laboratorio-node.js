export const name = "20261126-index-names";
export const statements = [
  "ALTER TABLE users RENAME INDEX email TO uq_users_email",
  "ALTER TABLE user_profiles RENAME INDEX user_id TO uq_profiles_user",
  "ALTER TABLE password_reset_tokens RENAME INDEX token_hash TO uq_reset_token_hash",
  "ALTER TABLE auth_attempts RENAME INDEX scope_key TO uq_auth_attempts_scope",
];
