variable "project_name" {
  description = "AI-devops-Copilot"
  type        = string
}

variable "environment" {
  description = "Environment"
  type        = string
}

variable "callback_urls" {
  type = list(string)
}

variable "logout_urls" {
  type = list(string)
}