output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.user_pool_client_id
}

output "cognito_domain" {
  value = module.cognito.domain
}

output "cognito_issuer" {
  value = module.cognito.issuer
}

output "incident_history_db_endpoint" {
  value = module.incident_history_db.endpoint
}

output "incident_history_db_name" {
  value = module.incident_history_db.database_name
}

output "incident_history_db_credentials_secret_arn" {
  value = module.incident_history_db.credentials_secret_arn
}