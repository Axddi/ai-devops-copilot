module "vpc" {
  source      = "../../modules/vpc"
  environment = var.environment
  region      = var.aws_region
}

module "eks" {
  source          = "../../modules/eks"
  cluster_name    = var.cluster_name
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

module "cognito" {

  source = "../../modules/cognito"

  project_name = "ai-devops"

  environment = "dev"

  callback_urls = [
    "http://localhost:3000/api/auth/callback/cognito"
  ]

  logout_urls = [
    "http://localhost:3000"
  ]
}