module "vpc" {
  source      = "../../modules/vpc"
  environment = var.environment
  region      = var.aws_region
}