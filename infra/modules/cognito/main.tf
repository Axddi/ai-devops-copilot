resource "aws_cognito_user_pool" "this" {

  name = "${var.project_name}-${var.environment}-userpool"

  username_attributes = ["email"]

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  tags = {
    Project = var.project_name
  }
}

resource "aws_cognito_user_pool_client" "this" {

  name = "${var.project_name}-client"

  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  callback_urls = var.callback_urls

  logout_urls = var.logout_urls

  supported_identity_providers = [
    "COGNITO"
  ]
}

resource "aws_cognito_user_pool_domain" "this" {

  domain = "${var.project_name}-${var.environment}"

  user_pool_id = aws_cognito_user_pool.this.id
}

resource "aws_cognito_user_group" "admin" {

  name = "Admin"

  user_pool_id = aws_cognito_user_pool.this.id
}

resource "aws_cognito_user_group" "sre" {

  name = "SRE"

  user_pool_id = aws_cognito_user_pool.this.id
}

resource "aws_cognito_user_group" "viewer" {

  name = "Viewer"

  user_pool_id = aws_cognito_user_pool.this.id
}