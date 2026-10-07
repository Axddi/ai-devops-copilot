resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-${var.environment}-history"
  subnet_ids = var.private_subnet_ids

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_security_group" "this" {
  name_prefix = "${var.project_name}-${var.environment}-history-"
  description = "Allow MySQL access only from the EKS node security group"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-history"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_security_group_ingress_rule" "eks_mysql" {
  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.eks_node_security_group_id
  from_port                    = 3306
  to_port                      = 3306
  ip_protocol                  = "tcp"
  description                  = "MySQL from EKS worker nodes only"
}

resource "aws_db_instance" "this" {
  identifier                  = "${var.project_name}-${var.environment}-history"
  engine                      = "mysql"
  instance_class              = var.instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = "incident_history"
  username                    = "incident_history_admin"
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 7
  auto_minor_version_upgrade = true
  apply_immediately          = false
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${var.project_name}-${var.environment}-history-final"

  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  tags = {
    Name        = "${var.project_name}-${var.environment}-history"
    Project     = var.project_name
    Environment = var.environment
  }
}
