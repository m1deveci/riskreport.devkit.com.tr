/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: riskreport
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `incident_number_seq`
--

DROP TABLE IF EXISTS `incident_number_seq`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_number_seq` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `next_val` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incident_number_seq`
--

LOCK TABLES `incident_number_seq` WRITE;
/*!40000 ALTER TABLE `incident_number_seq` DISABLE KEYS */;
INSERT INTO `incident_number_seq` VALUES
(1,1);
/*!40000 ALTER TABLE `incident_number_seq` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `isg_experts`
--

DROP TABLE IF EXISTS `isg_experts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `isg_experts` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' CHECK (json_valid(`location_ids`)),
  PRIMARY KEY (`id`),
  KEY `idx_isg_experts_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `isg_experts`
--

LOCK TABLES `isg_experts` WRITE;
/*!40000 ALTER TABLE `isg_experts` DISABLE KEYS */;
INSERT INTO `isg_experts` VALUES
('8fff0b24-463b-433f-8f6f-457469333f29','Sefa Uçakkkuş','sefa.ucakkus@ravago.com','05498186941',1,'2025-11-18 09:29:17','2025-11-18 09:38:35','[\"706e609b-c3f5-11f0-91e2-0050568227fa\",\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"]');
/*!40000 ALTER TABLE `isg_experts` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`risk_report`@`localhost`*/ /*!50003 TRIGGER check_isg_experts_limit_insert
BEFORE INSERT ON isg_experts
FOR EACH ROW
BEGIN
  DECLARE active_count INT;

  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO active_count
    FROM isg_experts
    WHERE location_id = NEW.location_id AND is_active = true;

    IF active_count >= 5 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Bir lokasyonda maksimum 5 aktif İSG uzmanı olabilir';
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`risk_report`@`localhost`*/ /*!50003 TRIGGER check_isg_experts_limit_update
BEFORE UPDATE ON isg_experts
FOR EACH ROW
BEGIN
  DECLARE active_count INT;

  IF NEW.is_active = true AND OLD.is_active = false THEN
    SELECT COUNT(*) INTO active_count
    FROM isg_experts
    WHERE location_id = NEW.location_id AND is_active = true;

    IF active_count >= 5 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Bir lokasyonda maksimum 5 aktif İSG uzmanı olabilir';
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `description` longtext DEFAULT '',
  `main_email` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_locations_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES
('146bd77c-ee72-4170-9566-cf29b469ef20','TR-ALI Recycle Fabrika','','turkan.yolcu@ravago.com',1,'2025-11-28 09:00:12','2025-12-01 12:14:07'),
('3b4d3240-95ad-4ab8-97d3-179e7c8c7302','TR-ALI Eastchem Fabrika','','admin@devkit.com.tr',1,'2025-11-18 00:16:54','2025-12-01 12:14:14'),
('706e609b-c3f5-11f0-91e2-0050568227fa','TR-ALI Enplast Fabrika','','admin@devkit.com.tr',1,'2025-11-17 23:38:56','2025-12-01 12:14:21'),
('7c1b0039-c020-4a03-ae08-86275e45cdf5','TR-CAY Tekpol Fabrika','','admin@devkit.com.tr',1,'2025-12-01 10:07:17','2025-12-01 12:14:35'),
('f48c1d9d-3a54-4726-b52e-a4f1d85d1043','TR-ASR RBS Fabrika','','rbsfabrika@ravago.co',1,'2025-12-15 09:29:24','2025-12-15 09:29:40');
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_reactions`
--

DROP TABLE IF EXISTS `message_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` char(36) NOT NULL,
  `emoji` varchar(10) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_reaction` (`message_id`,`user_id`),
  KEY `idx_message_reactions_message_id` (`message_id`),
  KEY `idx_message_reactions_user_id` (`user_id`),
  CONSTRAINT `fk_message_reactions_message_id` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_reactions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_reactions`
--

LOCK TABLES `message_reactions` WRITE;
/*!40000 ALTER TABLE `message_reactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` char(36) NOT NULL,
  `receiver_id` char(36) NOT NULL,
  `message` longtext NOT NULL,
  `message_type` varchar(50) DEFAULT 'text',
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `edited_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_messages_sender_id` (`sender_id`),
  KEY `idx_messages_receiver_id` (`receiver_id`),
  KEY `idx_messages_conversation` (`sender_id`,`receiver_id`),
  KEY `idx_messages_created_at` (`created_at` DESC),
  KEY `idx_messages_is_read` (`is_read`),
  CONSTRAINT `fk_messages_receiver_id` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_sender_id` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `near_miss_reports`
--

DROP TABLE IF EXISTS `near_miss_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `near_miss_reports` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `incident_number` varchar(50) NOT NULL,
  `location_id` char(36) NOT NULL,
  `region_id` char(36) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `description` longtext DEFAULT '',
  `status` varchar(50) DEFAULT 'Yeni',
  `internal_notes` longtext DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `incident_number` (`incident_number`),
  KEY `idx_near_miss_reports_location_id` (`location_id`),
  KEY `idx_near_miss_reports_region_id` (`region_id`),
  KEY `idx_near_miss_reports_incident_number` (`incident_number`),
  KEY `idx_near_miss_reports_created_at` (`created_at` DESC),
  KEY `idx_near_miss_reports_status` (`status`),
  CONSTRAINT `fk_near_miss_reports_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_near_miss_reports_region_id` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `near_miss_reports`
--

LOCK TABLES `near_miss_reports` WRITE;
/*!40000 ALTER TABLE `near_miss_reports` DISABLE KEYS */;
INSERT INTO `near_miss_reports` VALUES
('4c56e8b9-c183-48fa-92a1-c58807fc344a','RK-2025-471096','146bd77c-ee72-4170-9566-cf29b469ef20','0e5eea53-38ce-4f93-b370-f5acd66b2faf','Mustafa Deveci','+90 549 802 72 11','/uploads/unknown-1764842066813-cifw32.jpg','Diğer','Sökülen direklerin bağlantı civataları açıkta duruyor, elektrikli ve normal araçlar geçerken lastik patlatabilir, yayalar takılıp düşebilir.','Yeni','','2025-12-04 12:54:27','2025-12-04 12:54:27');
/*!40000 ALTER TABLE `near_miss_reports` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`risk_report`@`localhost`*/ /*!50003 TRIGGER generate_incident_number_trigger
BEFORE INSERT ON near_miss_reports
FOR EACH ROW
BEGIN
  DECLARE next_num INT;
  DECLARE year_str VARCHAR(4);

  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    UPDATE incident_number_seq SET next_val = next_val + 1;
    SELECT next_val INTO next_num FROM incident_number_seq LIMIT 1;
    SET year_str = DATE_FORMAT(NOW(), '%Y');
    SET NEW.incident_number = CONCAT('RK-', year_str, '-', LPAD(next_num - 1, 6, '0'));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  KEY `idx_token` (`token`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regions`
--

DROP TABLE IF EXISTS `regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `regions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `location_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` longtext DEFAULT '',
  `qr_code_token` varchar(255) NOT NULL,
  `qr_code_url` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `scan_count` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_code_token` (`qr_code_token`),
  KEY `idx_regions_location_id` (`location_id`),
  KEY `idx_regions_qr_code_token` (`qr_code_token`),
  KEY `idx_regions_is_active` (`is_active`),
  CONSTRAINT `fk_regions_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regions`
--

LOCK TABLES `regions` WRITE;
/*!40000 ALTER TABLE `regions` DISABLE KEYS */;
INSERT INTO `regions` VALUES
('022d8df5-402b-4181-a2d4-dc472ca1eba4','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','YEDEK PARÇA DEPO','','y4wql6kqdz8tjz0gw6n5o','',1,1,'2025-12-02 11:56:53','2025-12-05 14:02:54'),
('0c21fcfb-2295-47d0-b698-19b25f579708','146bd77c-ee72-4170-9566-cf29b469ef20','Kalite Lab','','tzguja7c4e7kov1ee3kjf','',1,0,'2025-12-03 08:33:25','2025-12-03 08:33:25'),
('0e5eea53-38ce-4f93-b370-f5acd66b2faf','146bd77c-ee72-4170-9566-cf29b469ef20','Saha - Yeni Depo Sınırı - 1','','imdnb18w4yw35ifbfllq','',1,0,'2025-12-04 12:51:49','2025-12-04 12:51:49'),
('1404c786-f5d5-45ac-9565-514ec2249bea','146bd77c-ee72-4170-9566-cf29b469ef20','Üretim Hat 1','','5r5wr7z97mv1rfs2eexsvo','https://riskreport.devkit.com.tr/report/146bd77c-ee72-4170-9566-cf29b469ef20/5r5wr7z97mv1rfs2eexsvo?region=1404c786-f5d5-45ac-9565-514ec2249bea',1,0,'2025-12-02 08:56:49','2025-12-02 08:56:49'),
('17005b41-adee-4c6a-815d-4a6aa263a455','146bd77c-ee72-4170-9566-cf29b469ef20','Ofis Katı','','8sk5e13jlvnami7lryiilu','',1,0,'2025-12-02 10:36:48','2025-12-02 10:36:48'),
('172372ac-6d01-49de-b938-d81be5127631','706e609b-c3f5-11f0-91e2-0050568227fa','A Blok (Extruder Katı)','','qtuqfhu7rqs7ttfpcgfp7t','',1,0,'2025-12-04 13:34:14','2025-12-05 13:19:30'),
('188c60cb-855e-4d81-af8b-d5bd67e8c66c','706e609b-c3f5-11f0-91e2-0050568227fa','A-B Blok Bodrum Kat','','62v7w3kdvsjz2adpedbq6h','',1,1,'2025-12-04 13:37:20','2025-12-05 14:04:42'),
('18be2cb1-a2bd-4c00-a7a9-029c02dc2278','706e609b-c3f5-11f0-91e2-0050568227fa','D Blok İdari Bina','','yk89i2gn8ucm9gmgszvif','',1,0,'2025-12-04 13:33:52','2025-12-05 13:19:48'),
('1e00e558-251a-4aca-a6b2-e0e437e7bb49','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','ŞİŞİRME ÜNİTESİ','','iftigqagdv9gcbql4q1pw','',1,0,'2025-12-02 11:55:54','2025-12-02 11:55:54'),
('2a83a0e7-ba68-4bcb-a910-dc5ee9604e24','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','KULE BİNA(PAKETLEME)','','kvh7o1iggzdywqri4pwyq','',1,0,'2025-12-02 11:54:57','2025-12-02 11:54:57'),
('3739fa9d-cc0c-4517-b059-7a72c7e60f02','f48c1d9d-3a54-4726-b52e-a4f1d85d1043','Üretim Hat 1','','l8qun1kf7yde5pyhlp89w','',1,1,'2025-12-15 09:31:16','2025-12-15 09:31:31'),
('3c71a44a-df37-4a0a-b9f6-b7aa35b4d93f','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','ESKİ AZO BİNASI','','otcxomeehp6bjslmlxq0v','',1,0,'2025-12-02 13:33:09','2025-12-02 13:33:09'),
('3d57827c-a727-4c75-b89e-729ac6faf9a2','706e609b-c3f5-11f0-91e2-0050568227fa','Atık Alanı','','n0kfkf2poqhau4n3ypwx4f','',1,0,'2025-12-04 13:44:20','2025-12-05 13:20:12'),
('42014298-eaea-43e2-a4d3-3d60087d04c9','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','LOJİSTİK','','4fm2e3nj57busulfus9os','',1,0,'2025-12-02 11:57:38','2025-12-02 11:57:38'),
('4adabfec-5cee-4942-9dc1-ab4e3d4ae4d8','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','YENİ AZO BİNASI','','xflpg392pwsfvm2g38tnec','',1,0,'2025-12-02 13:32:55','2025-12-02 13:32:55'),
('5ba6941a-ca2b-4157-96af-2e56b60385d2','146bd77c-ee72-4170-9566-cf29b469ef20','İdari Bina','','xvk47fvjr9tcvzto3axto','',1,0,'2025-12-03 08:33:57','2025-12-03 08:33:57'),
('5bd7f5b9-a1d5-47a3-960b-0d346528402c','706e609b-c3f5-11f0-91e2-0050568227fa','B Blok Revir','','ry2cpdzawc8dkg4v767x7','',1,0,'2025-12-04 13:36:38','2025-12-05 13:20:21'),
('5c1907c6-2490-4631-acd7-08bc537b5196','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','REAKTÖR','','dk3s712pjvfyp3vnbwi3','',1,0,'2025-12-02 11:55:25','2025-12-02 11:55:25'),
('5ca187e2-081a-4feb-836c-666c7d61a734','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','DEMSU BİNASI','','e8qz3fln6jsdjrizptr8','',1,0,'2025-12-02 13:33:32','2025-12-02 13:33:32'),
('64665b4a-b379-4d52-9622-2b7c8bf9a515','706e609b-c3f5-11f0-91e2-0050568227fa','Fabrika (Dış Alanlar)','','b9tnzf4vfgltkw2crlo27','',1,0,'2025-12-04 13:42:52','2025-12-05 13:20:32'),
('6b363125-60d8-46fd-8afe-edfcacd6600b','706e609b-c3f5-11f0-91e2-0050568227fa','A Blok(Kalite Kontrol)','','5wm9bwltf84dvrppquovhn','',1,0,'2025-12-04 13:36:04','2025-12-05 13:20:41'),
('6e2d48ce-711e-43a5-9084-f41c229de2b5','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','İDARİ BİNA','','noblrqrjfydcgsvur8e5pd','',1,0,'2025-12-02 11:57:12','2025-12-02 11:57:12'),
('702c49ea-acec-4d1e-97be-f6bd06e1b275','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','EXTRUDER','','u3haek81mxswgkpht0qbo','',1,0,'2025-12-02 11:55:35','2025-12-02 11:55:35'),
('7a1ac3ba-c49e-4ef5-b51b-135b3d2324cd','706e609b-c3f5-11f0-91e2-0050568227fa','C Blok (Bakım Atölyesi)','','im4s08fkqzg53zmu5t6asa','',1,0,'2025-12-04 13:32:04','2025-12-05 13:20:51'),
('7c95680f-14ab-40cc-af46-16dce3182471','706e609b-c3f5-11f0-91e2-0050568227fa','C Blok Tmi Paketleme','','o3joxdc6uxqv5w61xydf','',1,0,'2025-12-04 13:33:37','2025-12-05 13:21:01'),
('840ad5c5-bbdb-4616-a431-30d4ef5ca88f','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','TEHLİKELİ ATIK ALANI','','n7zxofi84sa48ulwf6u7y3','',1,0,'2025-12-02 11:57:52','2025-12-02 11:57:52'),
('8a06d604-fdf2-4965-894f-af8167b0c437','146bd77c-ee72-4170-9566-cf29b469ef20','Giyotin','','fba82mlrmdvdvjtqprtsbw','https://riskreport.devkit.com.tr/report/146bd77c-ee72-4170-9566-cf29b469ef20/fba82mlrmdvdvjtqprtsbw?region=8a06d604-fdf2-4965-894f-af8167b0c437',1,0,'2025-12-02 08:57:35','2025-12-02 08:57:35'),
('8a1e0f01-5aa1-43c4-a043-159a35218163','146bd77c-ee72-4170-9566-cf29b469ef20','Bakım Atölyesi','','5c0abndhuyu1orbm6vkjq8','https://riskreport.devkit.com.tr/report/146bd77c-ee72-4170-9566-cf29b469ef20/5c0abndhuyu1orbm6vkjq8?region=8a1e0f01-5aa1-43c4-a043-159a35218163',1,1,'2025-12-02 08:57:12','2025-12-09 22:55:14'),
('8b3358e9-a4d7-4f04-97c3-e31c099ff453','146bd77c-ee72-4170-9566-cf29b469ef20','Üretim Hat 2','','9oes5ntlosu6fzrsh72vxx','https://riskreport.devkit.com.tr/report/146bd77c-ee72-4170-9566-cf29b469ef20/9oes5ntlosu6fzrsh72vxx?region=8b3358e9-a4d7-4f04-97c3-e31c099ff453',1,0,'2025-12-02 08:57:02','2025-12-02 08:57:02'),
('8c7ac67e-2658-46ad-9fbb-c7fe637a5a50','706e609b-c3f5-11f0-91e2-0050568227fa','E Blok Üretim Alanı','','smnkyhne3x1sx75amswju','',1,0,'2025-12-04 13:37:48','2025-12-05 13:21:09'),
('923fbc31-494e-4a04-a0a1-5f99b077f37d','146bd77c-ee72-4170-9566-cf29b469ef20','Makine Dairesi','','a6tz3a6oa5o5p8nxz7nln','',1,3,'2025-12-03 08:34:39','2025-12-16 20:45:45'),
('a9059d2b-a5cf-4546-bf47-7e78e0bf15ea','f48c1d9d-3a54-4726-b52e-a4f1d85d1043','Üretim Hat 3','','bsrlhloh9kw54qa6gyozbq','',1,1,'2026-01-12 13:22:13','2026-01-12 13:22:49'),
('ab920070-c140-4e84-85d1-41f53d541d1c','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','KİMYASAL DEPO','','qib6p75oa7a0vn5pmybdzq','',1,0,'2025-12-02 11:56:43','2025-12-02 11:56:43'),
('bfc203e3-f997-4900-9400-5e21c6992951','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','KOMPRESÖR BİNASI','','ik9cpsbojxcxsjjmywkzp','',1,0,'2025-12-02 11:56:25','2025-12-02 11:56:25'),
('c14c5cd4-b4a2-44ec-ad69-92fb5bd56d39','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','BAKIM ATÖLYESİ','','lt48wwb15wfm5r7zq8c7nb','',1,0,'2025-12-02 11:56:06','2025-12-02 11:56:06'),
('ce613d50-1980-4135-9d43-7e60cccbcdff','706e609b-c3f5-11f0-91e2-0050568227fa','E2 Blok Hammadde Depo','','wuc8150r4qcyt6crzl3lj','',1,0,'2025-12-04 13:42:04','2025-12-05 13:21:21'),
('d8efe3cd-241c-4f05-a6bb-7e63e96458e6','146bd77c-ee72-4170-9566-cf29b469ef20','Paketleme','','yf1mbixsszmsnd1bjoyrq','https://riskreport.devkit.com.tr/report/146bd77c-ee72-4170-9566-cf29b469ef20/yf1mbixsszmsnd1bjoyrq?region=d8efe3cd-241c-4f05-a6bb-7e63e96458e6',1,0,'2025-12-02 08:57:21','2025-12-02 08:57:21'),
('e1192417-5a27-4043-a711-44be44561137','706e609b-c3f5-11f0-91e2-0050568227fa','F Blok İdari Bina','','iy5h67tj34rp94jjgy7gym','',1,0,'2025-12-04 13:40:36','2025-12-05 13:21:28'),
('e3c4f166-d862-45cc-b550-201cf4b65748','706e609b-c3f5-11f0-91e2-0050568227fa','A Blok (Besleme Katı)','','8tdqo3ld7lqn5asldajqx8','',1,0,'2025-12-04 13:35:11','2025-12-05 13:21:47'),
('fd8250fd-54c3-489a-9d3e-fd30adfe8ec7','f48c1d9d-3a54-4726-b52e-a4f1d85d1043','Üretim Hat 2','','8jylexpy4f9t381xppree','',1,0,'2025-12-15 09:31:21','2025-12-15 09:31:21'),
('fde64147-2ca4-42e8-8562-40547702c9fa','3b4d3240-95ad-4ab8-97d3-179e7c8c7302','LABORATUVAR','','qxatbdmfbws1e7vxcim7','',1,0,'2025-12-02 11:57:22','2025-12-02 11:57:22');
/*!40000 ALTER TABLE `regions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_history`
--

DROP TABLE IF EXISTS `report_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_history` (
  `id` varchar(36) NOT NULL,
  `report_id` varchar(36) NOT NULL,
  `changed_by_user_id` varchar(36) DEFAULT NULL,
  `changed_by_user_name` varchar(255) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `field_name` varchar(100) DEFAULT NULL,
  `old_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  `change_description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_report_id` (`report_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `report_history_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `near_miss_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_history`
--

LOCK TABLES `report_history` WRITE;
/*!40000 ALTER TABLE `report_history` DISABLE KEYS */;
INSERT INTO `report_history` VALUES
('38bf0e87-d0f7-11f0-8cfa-0050568227fa','4c56e8b9-c183-48fa-92a1-c58807fc344a',NULL,'Sistem','CREATE',NULL,NULL,NULL,'Rapor oluşturuldu - Başlayan: Mustafa Deveci, Kategori: Diğer','2025-12-04 09:54:27');
/*!40000 ALTER TABLE `report_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_system_logs_user_id` (`user_id`),
  KEY `idx_system_logs_created_at` (`created_at` DESC),
  KEY `idx_system_logs_action` (`action`),
  CONSTRAINT `fk_system_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_logs`
--

LOCK TABLES `system_logs` WRITE;
/*!40000 ALTER TABLE `system_logs` DISABLE KEYS */;
INSERT INTO `system_logs` VALUES
('0053cd91-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','UPDATE_REGION','{\"region_id\":\"e3c4f166-d862-45cc-b550-201cf4b65748\"}','','2025-12-04 13:35:49'),
('011e6613-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"5bd7f5b9-a1d5-47a3-960b-0d346528402c\"}','','2025-12-05 13:20:21'),
('015b1d27-d0fe-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','UPDATE_REGION','{\"region_id\":\"64665b4a-b379-4d52-9622-2b7c8bf9a515\"}','','2025-12-04 13:43:01'),
('02ee7d0f-ce93-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"gamze.bulut@ravago.com\",\"full_name\":\"Gamze Bulut\",\"role\":\"isg_expert\",\"locations\":[\"Aliağa Eastchem Fabrika\"],\"email_sent\":true}','','2025-12-01 11:52:04'),
('031c0eb7-ce93-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"gamze.bulut@ravago.com\"}','','2025-12-01 11:52:05'),
('056d8ae9-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"role\":\"isg_expert\",\"locations\":[\"Aliağa Eastchem Fabrika\",\"Aliağa Enplast Fabrika\",\"Taysad Tekpol Fabrika\"],\"email_sent\":true}','','2025-12-01 11:44:59'),
('05917af3-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\"}','','2025-12-01 11:44:59'),
('079f23de-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"64665b4a-b379-4d52-9622-2b7c8bf9a515\"}','','2025-12-05 13:20:32'),
('08d7f61b-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"6b363125-60d8-46fd-8afe-edfcacd6600b\",\"name\":\"A BLOK (KALİTE KONTROL)\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:36:04'),
('0c124b23-ce93-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"b0da4928-3449-460c-b72f-f27f4ad835ea\"}','','2025-12-01 11:52:20'),
('0d12cc11-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"6b363125-60d8-46fd-8afe-edfcacd6600b\"}','','2025-12-05 13:20:41'),
('0dca8cc6-d1cf-11f0-8f6a-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','LOGIN_SUCCESS','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\",\"ip\":\"2a00:1880:a242:2105:e073:4844:a72c:b922\"}','','2025-12-05 14:39:26'),
('1031b0cc-ce93-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"e5b2c574-8704-4c87-a8d5-32f4aae4dba7\"}','','2025-12-01 11:52:26'),
('1338ece9-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"7a1ac3ba-c49e-4ef5-b51b-135b3d2324cd\"}','','2025-12-05 13:20:51'),
('13da4970-c444-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_NEARMISS','{\"report_id\":\"9e295590-c2b5-4e85-b003-3ad8abb8559e\"}','','2025-11-18 09:01:51'),
('15fc3568-cf6a-11f0-9007-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"gamze.bulut@ravago.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-02 13:31:39'),
('1784478d-ce96-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_LOCATION','{\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-01 12:14:07'),
('191ac2aa-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"7c95680f-14ab-40cc-af46-16dce3182471\"}','','2025-12-05 13:21:01'),
('1b284387-ef82-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafaenes.unal@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"84.44.79.110\",\"attempts\":1}','','2026-01-12 09:44:12'),
('1bef36ba-ce96-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_LOCATION','{\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-01 12:14:15'),
('1c54540b-efa0-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafa.deveci@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 13:18:59'),
('1c7ae33d-c3fa-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"3a2a1df7-5f0e-4c77-a24f-1c70a048e8ad\"}','','2025-11-18 00:12:23'),
('1cbd2897-cdca-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"6e1f5086-2198-4ceb-be24-8bbd9e4a67c7\",\"action\":\"password_reset\"}','','2025-11-30 11:53:59'),
('1d449877-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"5bd7f5b9-a1d5-47a3-960b-0d346528402c\",\"name\":\"B BLOK REVİR\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:36:38'),
('1df6787d-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"8c7ac67e-2658-46ad-9fbb-c7fe637a5a50\"}','','2025-12-05 13:21:09'),
('201f1ad2-ce96-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_LOCATION','{\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-01 12:14:22'),
('207ae95b-c46f-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:10:01'),
('20a8ba9b-ce8e-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 11:17:07'),
('21eaebe9-cdfd-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"Deneme\"}','','2025-11-30 17:59:12'),
('230dec55-c3fa-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"TPE1\"}','','2025-11-18 00:12:34'),
('245a31e8-c472-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DOWNLOAD_BACKUP','{}','','2025-11-18 14:31:36'),
('24fdda63-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"ce613d50-1980-4135-9d43-7e60cccbcdff\"}','','2025-12-05 13:21:21'),
('262e6662-cc20-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_NEARMISS','{\"report_id\":\"8caac2da-3d9f-40e5-b08b-5d9143e0cc00\"}','','2025-11-28 09:04:49'),
('28430790-ce96-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_LOCATION','{\"location_id\":\"7c1b0039-c020-4a03-ae08-86275e45cdf5\"}','','2025-12-01 12:14:35'),
('2926bc89-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"e1192417-5a27-4043-a711-44be44561137\"}','','2025-12-05 13:21:28'),
('2cf3d040-cc20-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_NEARMISS','{\"report_id\":\"8caac2da-3d9f-40e5-b08b-5d9143e0cc00\"}','','2025-11-28 09:05:00'),
('2d321cb0-cf4a-11f0-90b9-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d','LOGIN_SUCCESS','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"ip\":\"31.206.43.62\"}','','2025-12-02 09:43:13'),
('2fbf1ddb-ce91-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 11:39:00'),
('3097b183-d0fe-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"3d57827c-a727-4c75-b89e-729ac6faf9a2\",\"name\":\"ATIK ALAN\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:44:20'),
('30ad3ca5-cf6a-11f0-9007-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"gamze.bulut@ravago.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":2}','','2025-12-02 13:32:23'),
('31267a43-cdf8-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\"}','','2025-11-30 17:23:50'),
('34dc1507-d1c4-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"e3c4f166-d862-45cc-b550-201cf4b65748\"}','','2025-12-05 13:21:47'),
('35bfe006-c449-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_ISG_EXPERT','{\"expert_id\":\"8fff0b24-463b-433f-8f6f-457469333f29\"}','','2025-11-18 09:38:36'),
('364eed10-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"188c60cb-855e-4d81-af8b-d5bd67e8c66c\",\"name\":\"A-B BLOK BODRUM KAT\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:37:20'),
('3692319e-cdcd-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-30 12:16:11'),
('38be9be3-d0f7-11f0-8cfa-0050568227fa',NULL,'CREATE_NEARMISS','{\"incident_number\":\"RK-2025-471096\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\",\"location_name\":\"TR-ALI Recycle Fabrika\",\"region_id\":\"0e5eea53-38ce-4f93-b370-f5acd66b2faf\",\"reporter_name\":\"Mustafa Deveci\",\"category\":\"Diğer\",\"phone\":\"+90 549 802 72 11\",\"email_recipients_count\":2,\"email_recipients\":\"Burcu Metin, Türkan Yolcu\"}','','2025-12-04 12:54:27'),
('39f86108-c449-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"7c5d7d4e-c3f1-11f0-91e2-0050568227fa\"}','','2025-11-18 09:38:43'),
('3a1ae5b1-c440-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"TPV1\"}','','2025-11-18 08:34:18'),
('3a5bca58-cdcd-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-30 12:16:17'),
('3aa047c3-cdf8-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\"}','','2025-11-30 17:24:06'),
('3ab856c1-cf6a-11f0-9007-0050568227fa','a7a4dafa-1cc4-43f1-b832-c40e3fd56ede','LOGIN_SUCCESS','{\"email\":\"gamze.bulut@ravago.com\",\"full_name\":\"Gamze Bulut\",\"ip\":\"31.206.43.62\"}','','2025-12-02 13:32:40'),
('3b258df3-c3f8-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"e54e5ef0-c3f5-11f0-91e2-0050568227fa\"}','','2025-11-17 23:58:56'),
('3c35bd59-cf48-11f0-90b9-0050568227fa',NULL,'UPDATE_PROFILE','{\"action\":\"profile_update\",\"field\":\"full_name\"}','','2025-12-02 09:29:19'),
('3caafed4-cf48-11f0-90b9-0050568227fa',NULL,'UPDATE_PROFILE','{\"action\":\"profile_picture_upload\"}','','2025-12-02 09:29:20'),
('429aea69-cdf8-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_LOCATION','{\"name\":\"Test Lokasyonu\"}','','2025-11-30 17:24:19'),
('43707a79-c3f8-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"A Blok Zemin Kat TPV1\"}','','2025-11-17 23:59:09'),
('43bc767f-cf6a-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"4adabfec-5cee-4942-9dc1-ab4e3d4ae4d8\",\"name\":\"YENİ AZO BİNASI\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 13:32:55'),
('447e0bc0-cf66-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','LOGIN_SUCCESS','{\"email\":\"gizem.yilmaz@ravago.com\",\"full_name\":\"Gizem Yılmaz\",\"ip\":\"31.206.43.62\"}','','2025-12-02 13:04:19'),
('457706d4-d0fa-11f0-8cfa-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-04 13:16:17'),
('45dca005-ce82-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_LOCATION','{\"location_id\":\"e0a07d72-5421-49f5-8d19-c13fcb607392\",\"location_name\":\"Test Lokasyonu\"}','','2025-12-01 09:52:15'),
('4705d07f-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"8c7ac67e-2658-46ad-9fbb-c7fe637a5a50\",\"name\":\"E BLOK ÜRETİM ALANI\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:37:48'),
('49990161-cdfc-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"marmarahaberlesme@hotmail.com\",\"reason\":\"Email bulunamadı\"}','','2025-11-30 17:53:09'),
('4a2e7be8-d404-11f0-8f6a-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','LOGIN_SUCCESS','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\",\"ip\":\"31.206.43.62\"}','','2025-12-08 10:05:33'),
('4ba7c110-ce80-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Test User\",\"ip\":\"31.206.43.62\"}','','2025-12-01 09:38:06'),
('4c26fa59-cf6a-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"3c71a44a-df37-4a0a-b9f6-b7aa35b4d93f\",\"name\":\"ESKİ AZO BİNASI\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 13:33:09'),
('4c5080d4-cea1-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"396f966d-4838-4237-93fa-341e37f17d9d\"}','','2025-12-01 13:34:20'),
('4ce63896-d04d-11f0-8f79-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-03 16:38:07'),
('4d71b184-cdfc-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\"}','','2025-11-30 17:53:15'),
('4de0a6f4-cea3-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 13:48:42'),
('4e62dd05-cf43-11f0-90b9-0050568227fa',NULL,'DELETE_REGION','{\"region_id\":\"c9fc97c6-3894-4eeb-b6a9-92558cd42e2d\"}','','2025-12-02 08:54:02'),
('4e6eee2a-cdf8-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Test User\",\"role\":\"isg_expert\"}','','2025-11-30 17:24:39'),
('4e92e665-cdf8-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\"}','','2025-11-30 17:24:39'),
('4f01b9a0-ce80-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"m1deveci91@gmail.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-01 09:38:11'),
('52e53fcc-ce82-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"role\":\"isg_expert\",\"locations\":[\"Recycle Fabrika\",\"Aliağa Eastchem Fabrika\",\"Aliağa Enplast Fabrika\"],\"email_sent\":true}','','2025-12-01 09:52:37'),
('5316041e-ce82-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\"}','','2025-12-01 09:52:37'),
('53ed1297-cdfc-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\"}','','2025-11-30 17:53:26'),
('54f70d68-ce80-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":2}','','2025-12-01 09:38:21'),
('5516bc42-d1ca-11f0-8f6a-0050568227fa',NULL,'CREATE_NEARMISS','{\"incident_number\":\"RK-2025-204092\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\",\"location_name\":\"TR-ALI Enplast Fabrika\",\"region_id\":\"188c60cb-855e-4d81-af8b-d5bd67e8c66c\",\"reporter_name\":\"Burcu Metin\",\"category\":\"Yangın\",\"phone\":\"+90 549 807 46 42\",\"email_recipients_count\":2,\"email_recipients\":\"Burcu Metin, Sefa Uçakkuş\"}','','2025-12-05 14:05:38'),
('554b253e-cf43-11f0-90b9-0050568227fa',NULL,'DELETE_REGION','{\"region_id\":\"dd88ed08-e272-47b6-93b7-c20e5a76314e\"}','','2025-12-02 08:54:14'),
('56b4b317-d1c2-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-05 13:08:25'),
('572c76d9-d97f-11f0-98b6-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-15 09:28:59'),
('57a97e30-efa1-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 13:27:48'),
('58736691-cf47-11f0-90b9-0050568227fa',NULL,'UPDATE_PROFILE','{\"action\":\"profile_update\",\"field\":\"full_name\"}','','2025-12-02 09:22:57'),
('590d5a61-cf7f-11f0-9007-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 16:03:51'),
('594a3a37-ef81-11f0-90d5-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"babur.bilgehan@ravago.com\",\"full_name\":\"Babür Bilgehan\",\"role\":\"admin\",\"locations\":[\"TR-ALI Recycle Fabrika\",\"TR-ALI Eastchem Fabrika\",\"TR-ALI Enplast Fabrika\",\"TR-CAY Tekpol Fabrika\",\"TR-ASR RBS Fabrika\"],\"email_sent\":true}','','2026-01-12 09:38:47'),
('59b78199-cf6a-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"5ca187e2-081a-4feb-836c-666c7d61a734\",\"name\":\"DEMSU BİNASI\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 13:33:32'),
('59dcd163-ce80-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":3}','','2025-12-01 09:38:30'),
('5d6ff7c1-efa0-11f0-90d5-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','RESET_PASSWORD','{\"user_id\":\"fb4deab0-c489-43cb-b888-af6b9e4cd45e\"}','','2026-01-12 13:20:48'),
('5e626574-efa1-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 13:28:00'),
('5f55af3c-ce84-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_LOCATION','{\"name\":\"Taysad Tekpol Fabrika\"}','','2025-12-01 10:07:17'),
('6105ba15-ca8e-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_NEARMISS','{\"report_id\":\"57b4f10d-3298-4eb2-9493-edda7bbace54\"}','','2025-11-26 09:08:50'),
('61e45ed1-cdf8-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"Test Bölgesi\"}','','2025-11-30 17:25:12'),
('63b7641a-d0fd-11f0-8cfa-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-04 13:38:36'),
('6509a55e-ca8e-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_NEARMISS','{\"report_id\":\"57b4f10d-3298-4eb2-9493-edda7bbace54\"}','','2025-11-26 09:08:57'),
('65d5fa97-efa0-11f0-90d5-0050568227fa','fb4deab0-c489-43cb-b888-af6b9e4cd45e','LOGIN_SUCCESS','{\"email\":\"davut.coskun@ravago.com\",\"full_name\":\"Davut Coşkun\",\"ip\":\"31.206.43.62\"}','','2026-01-12 13:21:03'),
('66c2dc24-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','LOGIN_SUCCESS','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\",\"ip\":\"31.206.43.62\"}','','2025-12-04 13:31:32'),
('66fa5848-c3f5-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_LOCATION','{\"location_id\":\"aad2fe27-c3e5-11f0-91e2-0050568227fa\"}','','2025-11-17 23:38:41'),
('69e56bb4-ce9c-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"46.106.64.142\",\"attempts\":1}','','2025-12-01 12:59:22'),
('7099fd20-c3f5-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_LOCATION','{\"name\":\"Aliağa Enplast Fabrika\"}','','2025-11-17 23:38:57'),
('716a64fb-cf7f-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-02 16:04:31'),
('723851a9-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','LOGIN_SUCCESS','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\",\"ip\":\"31.206.43.62\"}','','2025-12-04 13:31:51'),
('7362d3eb-cea1-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 13:35:26'),
('759e9806-cf76-11f0-9007-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 15:00:13'),
('76164927-cf7f-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"d3303c84-4443-408d-b638-c1bffd0a98c4\"}','','2025-12-02 16:04:39'),
('7773a991-ce9c-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 12:59:45'),
('7842e78b-c471-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:26:47'),
('79fafb2f-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"7a1ac3ba-c49e-4ef5-b51b-135b3d2324cd\",\"name\":\"C BLOK (BAKIM ATÖLYESİ)\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:32:04'),
('7a6e6c47-ca8e-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_NEARMISS','{\"report_id\":\"57b4f10d-3298-4eb2-9493-edda7bbace54\"}','','2025-11-26 09:09:33'),
('7ac3ae38-cdf5-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"marmarahaberlesme@hotmail.com\",\"reason\":\"Email bulunamadı\"}','','2025-11-30 17:04:25'),
('7b69fc10-ce9c-11f0-90b9-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d','LOGIN_SUCCESS','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"ip\":\"31.206.43.62\"}','','2025-12-01 12:59:52'),
('7bd37218-d5b9-11f0-98b6-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-10 14:15:07'),
('7cde7fac-cf46-11f0-90b9-0050568227fa',NULL,'UPDATE_PROFILE','{\"action\":\"profile_update\",\"field\":\"full_name\"}','','2025-12-02 09:16:49'),
('7d0cc317-c3fa-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"c4a92050-9e87-4952-8703-c2af161f3683\"}','','2025-11-18 00:15:05'),
('7d86712c-cdf8-11f0-90b9-0050568227fa',NULL,'CREATE_NEARMISS','{\"incident_number\":\"RK-2025-448034\",\"location_id\":\"e0a07d72-5421-49f5-8d19-c13fcb607392\",\"location_name\":\"Test Lokasyonu\",\"region_id\":\"23376d40-9ac3-44ea-becb-1ea837a85b5d\",\"reporter_name\":\"Mustafa Deveci\",\"category\":\"Makine Güvenliği\",\"phone\":\"+90 534 417 49 43\",\"email_recipients_count\":1,\"email_recipients\":\"Test User\"}','','2025-11-30 17:25:58'),
('7f15d159-d009-11f0-9007-0050568227fa','b0da4928-3449-460c-b72f-f27f4ad835ea','LOGIN_SUCCESS','{\"email\":\"turkan.yolcu@ravago.com\",\"full_name\":\"Türkan Yolcu\",\"ip\":\"31.206.43.62\"}','','2025-12-03 08:32:45'),
('7f29d1e1-ceb7-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"burcu.metin@ravago.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-01 16:13:15'),
('80d42aec-c3fa-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"TPE1\"}','','2025-11-18 00:15:11'),
('80e9338f-df24-11f0-98b6-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-22 13:53:52'),
('816444ec-efa1-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 13:28:58'),
('818e127a-cc1f-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_LOCATION','{\"name\":\"Recycle Fabrika\"}','','2025-11-28 09:00:13'),
('81f4e6c2-d97f-11f0-98b6-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"davut.coskun@ravago.com\",\"full_name\":\"Davut Coşkun\",\"role\":\"isg_expert\",\"locations\":[\"TR-ASR RBS Fabrika\"],\"email_sent\":true}','','2025-12-15 09:30:11'),
('838f9916-c46f-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:12:47'),
('83bcc552-ceb7-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 16:13:22'),
('848b5363-c46f-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:12:49'),
('849cdc7d-ef82-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafaenes.unal@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"84.44.79.110\",\"attempts\":1}','','2026-01-12 09:47:09'),
('85c9161e-c46f-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:12:51'),
('85cb4bb1-ce93-11f0-90b9-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','LOGIN_SUCCESS','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\",\"ip\":\"31.206.43.62\"}','','2025-12-01 11:55:44'),
('87adb739-cf46-11f0-90b9-0050568227fa',NULL,'UPDATE_PROFILE','{\"action\":\"profile_update\",\"field\":\"full_name\"}','','2025-12-02 09:17:07'),
('8b045e89-ce7e-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Test User\"}','','2025-12-01 09:25:33'),
('8b4cea19-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"6e1f5086-2198-4ceb-be24-8bbd9e4a67c7\"}','','2025-12-01 11:48:44'),
('8b6d6fdb-ce81-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"aab2fc7d-f55c-4a93-b79e-cd0ecad148dd\"}','','2025-12-01 09:47:02'),
('8b71e1e0-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"6e1f5086-2198-4ceb-be24-8bbd9e4a67c7\",\"user_name\":\"Sefa Uçakkuş\",\"user_email\":\"sefa.ucakkus@ravago.com\",\"user_role\":\"isg_expert\"}','','2025-12-01 11:48:44'),
('8d0176ab-e22f-11f0-98b6-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-26 10:50:30'),
('8d192ab9-efa1-11f0-90d5-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2026-01-12 13:29:18'),
('8d92c0c2-d97f-11f0-98b6-0050568227fa','fb4deab0-c489-43cb-b888-af6b9e4cd45e','LOGIN_SUCCESS','{\"email\":\"davut.coskun@ravago.com\",\"full_name\":\"Davut Coşkun\",\"ip\":\"31.206.43.62\"}','','2025-12-15 09:30:30'),
('8db57236-c3f9-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"8485a9e3-9909-4634-9250-172560d905ce\"}','','2025-11-18 00:08:24'),
('8e0275ce-cf41-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-02 08:41:30'),
('8e09dcff-ceb7-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"role\":\"viewer\",\"locations\":[\"TR-ALI Recycle Fabrika\"],\"email_sent\":true}','','2025-12-01 16:13:40'),
('8e56f39c-df24-11f0-98b6-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafa.deveci@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-22 13:54:14'),
('8e8f4550-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"40c55fe2-4f9d-4612-bc3f-f3be87de036c\"}','','2025-12-01 11:48:49'),
('8eb44048-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"40c55fe2-4f9d-4612-bc3f-f3be87de036c\",\"user_name\":\"Mustafa Test\",\"user_email\":\"m1deveci91@gmail.com\",\"user_role\":\"isg_expert\"}','','2025-12-01 11:48:49'),
('8f860b9e-efa0-11f0-90d5-0050568227fa','fb4deab0-c489-43cb-b888-af6b9e4cd45e','CREATE_REGION','{\"region_id\":\"a9059d2b-a5cf-4546-bf47-7e78e0bf15ea\",\"name\":\"Üretim Hat 3\",\"location_id\":\"f48c1d9d-3a54-4726-b52e-a4f1d85d1043\"}','','2026-01-12 13:22:13'),
('8fb37c90-cdf5-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\"}','','2025-11-30 17:05:00'),
('8fe5c74d-cc1f-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"Extruder-1\"}','','2025-11-28 09:00:37'),
('90a7c191-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"aab2fc7d-f55c-4a93-b79e-cd0ecad148dd\"}','','2025-12-01 11:48:53'),
('90b3344e-c508-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DOWNLOAD_BACKUP','{\"filename\":\"riskreport_backup_2025-11-19T05-28-22.sql\"}','127.0.0.1','2025-11-19 08:28:22'),
('90ccf788-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"aab2fc7d-f55c-4a93-b79e-cd0ecad148dd\",\"user_name\":\"Türkan Yolcu\",\"user_email\":\"turkan.yolcu@ravago.com\",\"user_role\":\"isg_expert\"}','','2025-12-01 11:48:53'),
('91fd7b26-cf7e-11f0-9007-0050568227fa',NULL,'UPDATE_REPORT','{\"report_id\":\"a8635cd5-ac18-4873-a5d4-78c6dc25c863\",\"user_name\":\"Mustafa Test\",\"changes\":[\"Durum değiştirildi: Yeni → İnceleniyor\"]}','','2025-12-02 15:58:17'),
('921fe9b6-ceb7-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-01 16:13:46'),
('9229f3ed-c3f6-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"dc3dd20f-c3f5-11f0-91e2-0050568227fa\"}','','2025-11-17 23:47:03'),
('922b77f2-c3f9-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"TPE1\"}','','2025-11-18 00:08:31'),
('92aa0753-ef7f-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafa.deveci@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 09:26:04'),
('93be0387-efa1-11f0-90d5-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','RESET_PASSWORD','{\"user_id\":\"7c5d7d4e-c3f1-11f0-91e2-0050568227fa\"}','','2026-01-12 13:29:29'),
('941a4b15-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"2a83a0e7-ba68-4bcb-a910-dc5ee9604e24\",\"name\":\"KULE BİNA(PAKETLEME)\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:54:57'),
('95690f00-df24-11f0-98b6-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-22 13:54:26'),
('9715df25-d009-11f0-9007-0050568227fa','b0da4928-3449-460c-b72f-f27f4ad835ea','CREATE_REGION','{\"region_id\":\"0c21fcfb-2295-47d0-b698-19b25f579708\",\"name\":\"Kalite Lab\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-03 08:33:25'),
('97a03786-ef7f-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 09:26:13'),
('97e0f2fd-ca8e-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"turkan.yolcu@ravago.com\"}','','2025-11-26 09:10:22'),
('99f7b701-efa1-11f0-90d5-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2026-01-12 13:29:40'),
('9a082e84-cf50-11f0-9007-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-02 10:29:13'),
('9b6c6030-cf77-11f0-9007-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-02 15:08:26'),
('9b6fd06a-df24-11f0-98b6-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafa.deveci@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-22 13:54:36'),
('9e027fb5-cea8-11f0-90b9-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','LOGIN_SUCCESS','{\"email\":\"gizem.yilmaz@ravago.com\",\"full_name\":\"Gizem Yılmaz\",\"ip\":\"31.206.43.62\"}','','2025-12-01 14:26:44'),
('a14b7de3-df24-11f0-98b6-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"mustafa.deveci@ravago.com\",\"reason\":\"Email bulunamadı\",\"ip\":\"31.206.43.62\",\"attempts\":2}','','2025-12-22 13:54:46'),
('a168f0eb-ef7f-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 09:26:29'),
('a42f05ed-ceb7-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 16:14:17'),
('a4811d05-cddb-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"6e1f5086-2198-4ceb-be24-8bbd9e4a67c7\",\"action\":\"manual_password_reset\"}','','2025-11-30 13:59:28'),
('a493ada2-cf77-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-02 15:08:41'),
('a4afb77d-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"5c1907c6-2490-4631-acd7-08bc537b5196\",\"name\":\"REAKTÖR\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:55:25'),
('a4b72c52-cf51-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"cfe0da39-bbac-467d-9866-abcdb9de6c15\"}','','2025-12-02 10:36:41'),
('a54dcaa9-ce7f-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\"}','','2025-12-01 09:33:27'),
('a72bd418-c508-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-19 08:29:00'),
('a7e0c760-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_LOCATION','{\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-01 11:49:31'),
('a87f76d6-c508-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-19 08:29:02'),
('a8a657e7-d97f-11f0-98b6-0050568227fa','fb4deab0-c489-43cb-b888-af6b9e4cd45e','CREATE_REGION','{\"region_id\":\"3739fa9d-cc0c-4517-b059-7a72c7e60f02\",\"name\":\"Üretim Hat 1\",\"location_id\":\"f48c1d9d-3a54-4726-b52e-a4f1d85d1043\"}','','2025-12-15 09:31:16'),
('a8de6789-cf74-11f0-9007-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 14:47:20'),
('a95c2ff3-cf51-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"region_id\":\"17005b41-adee-4c6a-815d-4a6aa263a455\",\"name\":\"Ofis Katı\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 10:36:48'),
('a9a5850e-cf43-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 08:56:35'),
('a9fe3d43-d009-11f0-9007-0050568227fa','b0da4928-3449-460c-b72f-f27f4ad835ea','CREATE_REGION','{\"region_id\":\"5ba6941a-ca2b-4157-96af-2e56b60385d2\",\"name\":\"İdari Bina\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-03 08:33:57'),
('aa48e6e8-c508-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-19 08:29:05'),
('aa5cb6d2-df24-11f0-98b6-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-22 13:55:01'),
('aab1c391-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"702c49ea-acec-4d1e-97be-f6bd06e1b275\",\"name\":\"EXTRUDER\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:55:35'),
('ab2478b3-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"e1192417-5a27-4043-a711-44be44561137\",\"name\":\"F BLOK İDARİ BİNA\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:40:36'),
('abf740d0-d97f-11f0-98b6-0050568227fa','fb4deab0-c489-43cb-b888-af6b9e4cd45e','CREATE_REGION','{\"region_id\":\"fd8250fd-54c3-489a-9d3e-fd30adfe8ec7\",\"name\":\"Üretim Hat 2\",\"location_id\":\"f48c1d9d-3a54-4726-b52e-a4f1d85d1043\"}','','2025-12-15 09:31:21'),
('ac1b4134-d0fc-11f0-8cfa-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d','LOGIN_SUCCESS','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"ip\":\"31.206.43.62\"}','','2025-12-04 13:33:28'),
('ae6bb2af-ce95-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"396f966d-4838-4237-93fa-341e37f17d9d\"}','','2025-12-01 12:11:11'),
('b1062106-cdfc-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"94e83e76-349e-4442-a1aa-c76ed6c98190\"}','','2025-11-30 17:56:02'),
('b161b9a8-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"7c95680f-14ab-40cc-af46-16dce3182471\",\"name\":\"C BLOK TMI PAKETLEME\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:33:37'),
('b1af4881-cf43-11f0-90b9-0050568227fa',NULL,'CREATE_REGION','{\"region_id\":\"1404c786-f5d5-45ac-9565-514ec2249bea\",\"name\":\"Üretim Hat 1\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 08:56:49'),
('b1c2b0d2-cf43-11f0-90b9-0050568227fa',NULL,'UPDATE_REGION','{\"region_id\":\"1404c786-f5d5-45ac-9565-514ec2249bea\"}','','2025-12-02 08:56:49'),
('b26b64e8-cdfc-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"4945bce6-84d4-439c-9315-72d62fc24eff\"}','','2025-11-30 17:56:05'),
('b2dcccdb-ef7f-11f0-90d5-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"admin@devkit.com.tr\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2026-01-12 09:26:58'),
('b3976af1-cf45-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"176.54.128.230\"}','','2025-12-02 09:11:11'),
('b3bceb2d-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"sefa.ucakkus@ravago.com\",\"full_name\":\"Sefa Uçakkuş\",\"role\":\"isg_expert\",\"locations\":[\"Aliağa Recycle Fabrika\",\"Aliağa Eastchem Fabrika\",\"Aliağa Enplast Fabrika\"],\"email_sent\":true}','','2025-12-01 11:49:51'),
('b3e23038-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"sefa.ucakkus@ravago.com\"}','','2025-12-01 11:49:52'),
('b46788bc-cdfc-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"23376d40-9ac3-44ea-becb-1ea837a85b5d\"}','','2025-11-30 17:56:08'),
('b4e80c1b-c473-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:42:48'),
('b54024d8-c473-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:42:48'),
('b6054c0c-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"1e00e558-251a-4aca-a6b2-e0e437e7bb49\",\"name\":\"ŞİŞİRME ÜNİTESİ\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:55:54'),
('b97f3846-cf43-11f0-90b9-0050568227fa',NULL,'CREATE_REGION','{\"region_id\":\"8b3358e9-a4d7-4f04-97c3-e31c099ff453\",\"name\":\"Üretim Hat 2\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 08:57:02'),
('b999629d-cf43-11f0-90b9-0050568227fa',NULL,'UPDATE_REGION','{\"region_id\":\"8b3358e9-a4d7-4f04-97c3-e31c099ff453\"}','','2025-12-02 08:57:02'),
('ba1d2982-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"18be2cb1-a2bd-4c00-a7a9-029c02dc2278\",\"name\":\"D BLOK İDARİ BİNA\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:33:52'),
('bc51ed66-cea5-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 14:06:06'),
('bd123d6b-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"c14c5cd4-b4a2-44ec-ad69-92fb5bd56d39\",\"name\":\"BAKIM ATÖLYESİ\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:56:06'),
('be161776-c3fa-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_LOCATION','{\"name\":\"Aliağa Eastchem Fabrika\"}','','2025-11-18 00:16:54'),
('be5ac3e3-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"turkan.yolcu@ravago.com\",\"full_name\":\"Türkan Yolcu\",\"role\":\"isg_expert\",\"locations\":[\"Aliağa Recycle Fabrika\",\"Aliağa Eastchem Fabrika\",\"Aliağa Enplast Fabrika\"],\"email_sent\":true}','','2025-12-01 11:50:09'),
('be81d5dc-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"turkan.yolcu@ravago.com\"}','','2025-12-01 11:50:09'),
('beba0b99-cc1f-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"sefa.ucakkus@ravago.com\"}','','2025-11-28 09:01:55'),
('bfa0ba17-cf43-11f0-90b9-0050568227fa',NULL,'CREATE_REGION','{\"region_id\":\"8a1e0f01-5aa1-43c4-a043-159a35218163\",\"name\":\"Bakım Atölyesi\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 08:57:12'),
('bfb44115-cf43-11f0-90b9-0050568227fa',NULL,'UPDATE_REGION','{\"region_id\":\"8a1e0f01-5aa1-43c4-a043-159a35218163\"}','','2025-12-02 08:57:12'),
('c0143f92-d0f6-11f0-8cfa-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"176.54.150.48\"}','','2025-12-04 12:51:05'),
('c181ce43-cf72-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-02 14:33:42'),
('c22188d2-cf4f-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-02 10:23:11'),
('c22bb822-cea7-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"gizem.yilmaz@ravago.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-01 14:20:35'),
('c31bf246-d009-11f0-9007-0050568227fa','b0da4928-3449-460c-b72f-f27f4ad835ea','CREATE_REGION','{\"region_id\":\"923fbc31-494e-4a04-a0a1-5f99b077f37d\",\"name\":\"Makine Dairesi\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-03 08:34:39'),
('c4d24bfe-cf43-11f0-90b9-0050568227fa',NULL,'CREATE_REGION','{\"region_id\":\"d8efe3cd-241c-4f05-a6bb-7e63e96458e6\",\"name\":\"Paketleme\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 08:57:21'),
('c4e48a09-cf43-11f0-90b9-0050568227fa',NULL,'UPDATE_REGION','{\"region_id\":\"d8efe3cd-241c-4f05-a6bb-7e63e96458e6\"}','','2025-12-02 08:57:21'),
('c7453649-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"172372ac-6d01-49de-b938-d81be5127631\",\"name\":\"A BLOK ÜRETİM BİNASI (EXTRUDER KATI)\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:34:14'),
('c86c03a4-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"bfc203e3-f997-4900-9400-5e21c6992951\",\"name\":\"KOMPRESÖR BİNASI\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:56:25'),
('c8b6a04a-c46e-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 14:07:34'),
('c8c6ddc1-c3fa-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"EC Reaktör 1.Kat\"}','','2025-11-18 00:17:12'),
('c90e5b35-ce80-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"m1deveci91@gmail.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-01 09:41:36'),
('c9173fdc-d405-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-08 10:16:16'),
('ca8ad496-d1c3-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"172372ac-6d01-49de-b938-d81be5127631\"}','','2025-12-05 13:18:49'),
('cba880df-ce83-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DOWNLOAD_BACKUP','{\"filename\":\"riskreport_backup_2025-12-01T07-03-09.sql\"}','127.0.0.1','2025-12-01 10:03:09'),
('ccc5e4a5-ef7f-11f0-90d5-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2026-01-12 09:27:42'),
('ccf2ffe2-cf43-11f0-90b9-0050568227fa',NULL,'CREATE_REGION','{\"region_id\":\"8a06d604-fdf2-4965-894f-af8167b0c437\",\"name\":\"Giyotin\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 08:57:35'),
('cd07225c-cf43-11f0-90b9-0050568227fa',NULL,'UPDATE_REGION','{\"region_id\":\"8a06d604-fdf2-4965-894f-af8167b0c437\"}','','2025-12-02 08:57:35'),
('ce63f093-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"role\":\"isg_expert\",\"locations\":[\"Aliağa Recycle Fabrika\",\"Aliağa Eastchem Fabrika\",\"Aliağa Enplast Fabrika\"],\"email_sent\":true}','','2025-12-01 11:50:36'),
('ce89ad8b-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"burcu.metin@ravago.com\"}','','2025-12-01 11:50:36'),
('d1ee21ec-ce80-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-01 09:41:51'),
('d2611187-cea7-11f0-90b9-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','LOGIN_SUCCESS','{\"email\":\"gizem.yilmaz@ravago.com\",\"full_name\":\"Gizem Yılmaz\",\"ip\":\"31.206.43.62\"}','','2025-12-01 14:21:02'),
('d313f798-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"ab920070-c140-4e84-85d1-41f53d541d1c\",\"name\":\"KİMYASAL DEPO\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:56:43'),
('d4222b46-d1c3-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"64665b4a-b379-4d52-9622-2b7c8bf9a515\"}','','2025-12-05 13:19:05'),
('d6fc3b51-ce80-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"244139b3-3809-4271-9e15-35c19c550959\"}','','2025-12-01 09:42:00'),
('d72243bc-ce80-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"244139b3-3809-4271-9e15-35c19c550959\",\"user_name\":\"Test User\",\"user_email\":\"m1deveci91@gmail.com\",\"user_role\":\"isg_expert\"}','','2025-12-01 09:42:00'),
('d83821cf-cf7c-11f0-9007-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 15:45:55'),
('d9427286-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"022d8df5-402b-4181-a2d4-dc472ca1eba4\",\"name\":\"YEDEK PARÇA DEPO\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:56:53'),
('d9648116-cdf0-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"6e1f5086-2198-4ceb-be24-8bbd9e4a67c7\",\"action\":\"manual_password_reset\"}','','2025-11-30 16:31:16'),
('d96e5303-cf83-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','LOGIN_SUCCESS','{\"email\":\"admin@devkit.com.tr\",\"full_name\":\"Mustafa Deveci\",\"ip\":\"31.206.43.62\"}','','2025-12-02 16:36:04'),
('da5611e3-d0f6-11f0-8cfa-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"region_id\":\"0e5eea53-38ce-4f93-b370-f5acd66b2faf\",\"name\":\"Saha - Yeni Depo Sınırı - 1\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-04 12:51:49'),
('ddba7551-d1b7-11f0-8f6a-0050568227fa','b0da4928-3449-460c-b72f-f27f4ad835ea','LOGIN_SUCCESS','{\"email\":\"turkan.yolcu@ravago.com\",\"full_name\":\"Türkan Yolcu\",\"ip\":\"31.206.43.62\"}','','2025-12-05 11:53:27'),
('df6b1f0a-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"ce613d50-1980-4135-9d43-7e60cccbcdff\",\"name\":\"E2 BLOK HAMMADDE DEPO\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:42:04'),
('e04f2446-d75b-11f0-98b6-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d','LOGIN_SUCCESS','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"ip\":\"31.206.43.62\"}','','2025-12-12 16:10:05'),
('e2c0b1a5-d1c3-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"172372ac-6d01-49de-b938-d81be5127631\"}','','2025-12-05 13:19:30'),
('e35bb98a-cf42-11f0-90b9-0050568227fa',NULL,'LOGIN_FAILED','{\"email\":\"m1deveci91@gmail.com\",\"reason\":\"Şifre hatalı\",\"ip\":\"31.206.43.62\",\"attempts\":1}','','2025-12-02 08:51:03'),
('e477c28c-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"6e2d48ce-711e-43a5-9084-f41c229de2b5\",\"name\":\"İDARİ BİNA\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:57:12'),
('e5e02e41-d100-11f0-8cfa-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"172372ac-6d01-49de-b938-d81be5127631\"}','','2025-12-04 14:03:43'),
('e77ca089-cf76-11f0-9007-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 15:03:24'),
('e80b05ea-c3f9-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"95b5984e-c01b-454f-ac2b-7eeeb6923c58\"}','','2025-11-18 00:10:55'),
('e832fc28-cf42-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Mustafa Test\",\"ip\":\"31.206.43.62\"}','','2025-12-02 08:51:11'),
('e8a9dbf4-c447-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_ISG_EXPERT','{\"name\":\"Sefa Uçakkkuş\"}','','2025-11-18 09:29:17'),
('e9615942-d1c3-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"188c60cb-855e-4d81-af8b-d5bd67e8c66c\"}','','2025-12-05 13:19:41'),
('e97329cd-cf50-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"region_id\":\"cfe0da39-bbac-467d-9866-abcdb9de6c15\",\"name\":\"Ofis Katı\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 10:31:26'),
('e9962be6-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"e3c4f166-d862-45cc-b550-201cf4b65748\",\"name\":\"A BLOK ÜRETİM BİNASI (RECEİER KATI)\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:35:11'),
('ea9e5045-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"fde64147-2ca4-42e8-8562-40547702c9fa\",\"name\":\"LABORATUVAR\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:57:22'),
('eb0f3a31-ce7e-11f0-90b9-0050568227fa',NULL,'LOGIN_SUCCESS','{\"email\":\"m1deveci91@gmail.com\",\"full_name\":\"Test User\"}','','2025-12-01 09:28:14'),
('ed1059d4-cf42-11f0-90b9-0050568227fa',NULL,'CREATE_REGION','{\"region_id\":\"c9fc97c6-3894-4eeb-b6a9-92558cd42e2d\",\"name\":\"TEST\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\"}','','2025-12-02 08:51:19'),
('ed253d96-cf42-11f0-90b9-0050568227fa',NULL,'UPDATE_REGION','{\"region_id\":\"c9fc97c6-3894-4eeb-b6a9-92558cd42e2d\"}','','2025-12-02 08:51:19'),
('edeb6358-d1c3-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"18be2cb1-a2bd-4c00-a7a9-029c02dc2278\"}','','2025-12-05 13:19:48'),
('ee1a4fc9-c3f9-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_REGION','{\"name\":\"TPV1\"}','','2025-11-18 00:11:05'),
('ef4bca9d-ce93-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DOWNLOAD_BACKUP','{\"filename\":\"riskreport_backup_2025-12-01T08-58-41.sql\"}','127.0.0.1','2025-12-01 11:58:41'),
('ef7f9e1d-cf8f-11f0-9007-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d','LOGIN_SUCCESS','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"ip\":\"2a00:1880:a24a:3209:187d:6af7:559a:b59\"}','','2025-12-02 18:02:35'),
('f070649e-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','UPDATE_REGION','{\"region_id\":\"e3c4f166-d862-45cc-b550-201cf4b65748\"}','','2025-12-04 13:35:23'),
('f18044bf-ceaa-11f0-90b9-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','RESET_PASSWORD','{\"user_id\":\"fe4acaa9-abe9-43dc-8297-54f61f79e2d6\"}','','2025-12-01 14:43:23'),
('f2238935-cea2-11f0-90b9-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d','LOGIN_SUCCESS','{\"email\":\"burcu.metin@ravago.com\",\"full_name\":\"Burcu Metin\",\"ip\":\"31.206.43.62\"}','','2025-12-01 13:46:08'),
('f3f6f8b8-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"42014298-eaea-43e2-a4d3-3d60087d04c9\",\"name\":\"LOJİSTİK\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:57:38'),
('f4e759c1-c449-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_SETTINGS','{}','','2025-11-18 09:43:56'),
('f70c1a6b-c448-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_USER','{\"user_id\":\"7c5d7d4e-c3f1-11f0-91e2-0050568227fa\"}','','2025-11-18 09:36:50'),
('f74f7ac2-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"gizem.yilmaz@ravago.com\",\"full_name\":\"Gizem Yılmaz\",\"role\":\"isg_expert\",\"locations\":[\"Aliağa Eastchem Fabrika\"],\"email_sent\":true}','','2025-12-01 11:51:45'),
('f783424c-ce92-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_USER','{\"email\":\"gizem.yilmaz@ravago.com\"}','','2025-12-01 11:51:45'),
('f8317f1d-c43f-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"b0c846aa-17dd-4b8f-a53a-9f6543657a2b\"}','','2025-11-18 08:32:27'),
('f8a90947-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','UPDATE_REGION','{\"region_id\":\"e3c4f166-d862-45cc-b550-201cf4b65748\"}','','2025-12-04 13:35:37'),
('f9913c13-c43f-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_REGION','{\"region_id\":\"989ca039-985a-40d6-bbb3-26b51701fb97\"}','','2025-11-18 08:32:29'),
('fac1a55a-ceaa-11f0-90b9-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','LOGIN_SUCCESS','{\"email\":\"gizem.yilmaz@ravago.com\",\"full_name\":\"Gizem Yılmaz\",\"ip\":\"31.206.43.62\"}','','2025-12-01 14:43:38'),
('facb3e29-ce91-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"e4e5b984-4c91-4241-81e7-e44796af857e\"}','','2025-12-01 11:44:41'),
('faef2077-ce91-11f0-90b9-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','DELETE_USER','{\"user_id\":\"e4e5b984-4c91-4241-81e7-e44796af857e\",\"user_name\":\"Mustafa Test\",\"user_email\":\"m1deveci91@gmail.com\",\"user_role\":\"isg_expert\"}','','2025-12-01 11:44:41'),
('fafac903-d100-11f0-8cfa-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"172372ac-6d01-49de-b938-d81be5127631\"}','','2025-12-04 14:04:18'),
('fbd8df5a-d1c3-11f0-8f6a-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','UPDATE_REGION','{\"region_id\":\"3d57827c-a727-4c75-b89e-729ac6faf9a2\"}','','2025-12-05 13:20:12'),
('fc258c0c-d0fd-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7','CREATE_REGION','{\"region_id\":\"64665b4a-b379-4d52-9622-2b7c8bf9a515\",\"name\":\"FABRİKA SAHASI (DIŞ ALANLAR\",\"location_id\":\"706e609b-c3f5-11f0-91e2-0050568227fa\"}','','2025-12-04 13:42:52'),
('fc943099-cf5c-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6','CREATE_REGION','{\"region_id\":\"840ad5c5-bbdb-4616-a431-30d4ef5ca88f\",\"name\":\"TEHLİKELİ ATIK ALANI\",\"location_id\":\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"}','','2025-12-02 11:57:52'),
('fd38a6f2-c3f3-11f0-91e2-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa','CREATE_LOCATION','{\"name\":\"Aliağa\"}','','2025-11-17 23:28:34'),
('fd6f05a2-cf43-11f0-90b9-0050568227fa',NULL,'CREATE_NEARMISS','{\"incident_number\":\"RK-2025-772808\",\"location_id\":\"146bd77c-ee72-4170-9566-cf29b469ef20\",\"location_name\":\"TR-ALI Recycle Fabrika\",\"region_id\":\"8a06d604-fdf2-4965-894f-af8167b0c437\",\"reporter_name\":\"Mustafa Deveci\",\"category\":\"Makine Güvenliği\",\"phone\":\"+90 534 417 49 43\",\"email_recipients_count\":3,\"email_recipients\":\"Burcu Metin, Türkan Yolcu, Mustafa Test\"}','','2025-12-02 08:58:56');
/*!40000 ALTER TABLE `system_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `site_title` varchar(255) DEFAULT 'Ramak Kala Raporlama Sistemi',
  `smtp_host` varchar(255) DEFAULT '',
  `smtp_port` int(11) DEFAULT 587,
  `smtp_username` varchar(255) DEFAULT '',
  `smtp_password` varchar(255) DEFAULT '',
  `smtp_from_email` varchar(255) DEFAULT '',
  `backup_target_path` text DEFAULT '',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `logo_path` varchar(500) DEFAULT '',
  `background_path` varchar(500) DEFAULT '',
  `favicon_path` varchar(500) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES
('2fe08c17-c3e5-11f0-91e2-0050568227fa','Ramakkala ve Tehlike Raporlama Sistemi','mail.devkit.com.tr',587,'report@devkit.com.tr','gzPdkrF3Fd3K','report@devkit.com.tr','','2025-11-17 21:42:36','2026-01-12 14:01:37','/uploads/unknown-1763464039435-r95byn.png','/uploads/unknown-1763466166143-ifecmp.jpg','/uploads/unknown-1763465205185-0dcnzf.png');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `typing_status`
--

DROP TABLE IF EXISTS `typing_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `typing_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` char(36) NOT NULL,
  `receiver_id` char(36) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_typing` (`user_id`,`receiver_id`),
  KEY `idx_typing_status_user_id` (`user_id`),
  KEY `idx_typing_status_receiver_id` (`receiver_id`),
  KEY `idx_typing_status_created_at` (`created_at`),
  CONSTRAINT `fk_typing_status_receiver_id` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_typing_status_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `typing_status`
--

LOCK TABLES `typing_status` WRITE;
/*!40000 ALTER TABLE `typing_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `typing_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `is_online` tinyint(1) DEFAULT 1,
  `last_activity` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `login_time` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_sessions_is_online` (`is_online`),
  KEY `idx_user_sessions_last_activity` (`last_activity`),
  KEY `idx_user_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_user_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES
('3ab772a7-cf6a-11f0-9007-0050568227fa','a7a4dafa-1cc4-43f1-b832-c40e3fd56ede',1,'2025-12-02 13:32:40','2025-12-02 13:32:40','2025-12-02 13:32:40'),
('447a38e6-cf66-11f0-9007-0050568227fa','fe4acaa9-abe9-43dc-8297-54f61f79e2d6',1,'2025-12-02 13:04:19','2025-12-02 13:04:19','2025-12-02 13:04:19'),
('66c2132c-d0fc-11f0-8cfa-0050568227fa','e5b2c574-8704-4c87-a8d5-32f4aae4dba7',1,'2025-12-09 08:54:40','2025-12-04 13:31:32','2025-12-04 13:31:32'),
('7f13656a-d009-11f0-9007-0050568227fa','b0da4928-3449-460c-b72f-f27f4ad835ea',1,'2025-12-05 16:36:14','2025-12-03 08:32:45','2025-12-03 08:32:45'),
('8d91ab9b-d97f-11f0-98b6-0050568227fa','fb4deab0-c489-43cb-b888-af6b9e4cd45e',1,'2026-01-12 13:25:03','2025-12-15 09:30:30','2025-12-15 09:30:30'),
('c21ce484-cf4f-11f0-9007-0050568227fa','7c5d7d4e-c3f1-11f0-91e2-0050568227fa',1,'2026-01-12 14:01:51','2025-12-02 10:23:11','2025-12-02 10:23:11'),
('ef7d64bb-cf8f-11f0-9007-0050568227fa','396f966d-4838-4237-93fa-341e37f17d9d',1,'2025-12-12 16:28:17','2025-12-02 18:02:35','2025-12-02 18:02:35');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'viewer',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' CHECK (json_valid(`location_ids`)),
  `last_login` datetime DEFAULT NULL,
  `profile_picture` longblob DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
('396f966d-4838-4237-93fa-341e37f17d9d','Burcu Metin','burcu.metin@ravago.com','$2b$10$s48F//igHR8rCFodOuEwluoTSYKH2XxH283QKs.xgpAUCNcJrHMj.','isg_expert',1,'2025-12-01 11:50:36','2025-12-12 16:10:05','[\"706e609b-c3f5-11f0-91e2-0050568227fa\",\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\",\"146bd77c-ee72-4170-9566-cf29b469ef20\"]','2025-12-12 16:10:05',NULL),
('7c5d7d4e-c3f1-11f0-91e2-0050568227fa','Mustafa Deveci','admin@devkit.com.tr','$2b$10$iDd2.0B/IWU4yqkaI1A3OO/QzZDJ34esupp6QKAREu89b2Uxl6dGi','admin',1,'2025-11-17 23:10:38','2026-01-12 13:29:40','[]','2026-01-12 13:29:40',NULL),
('a420e287-85d9-46af-a6fa-9cca172f6b38','Babür Bilgehan','babur.bilgehan@ravago.com','$2b$10$l5cnex.XROLB8byfYPCzF.CshVHYl3D4Lek743sJ4Ca9Lxqa9WMQy','admin',1,'2026-01-12 09:38:47','2026-01-12 09:38:47','[\"146bd77c-ee72-4170-9566-cf29b469ef20\",\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\",\"706e609b-c3f5-11f0-91e2-0050568227fa\",\"7c1b0039-c020-4a03-ae08-86275e45cdf5\",\"f48c1d9d-3a54-4726-b52e-a4f1d85d1043\"]',NULL,NULL),
('a7a4dafa-1cc4-43f1-b832-c40e3fd56ede','Gamze Bulut','gamze.bulut@ravago.com','$2b$10$PH./KnLYUE5jj0WO3aUgcesodAw1JhfWbZ.JkDv8dv15TyeZ7VSRm','isg_expert',1,'2025-12-01 11:52:04','2025-12-02 13:32:40','[\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"]','2025-12-02 13:32:40',NULL),
('b0da4928-3449-460c-b72f-f27f4ad835ea','Türkan Yolcu','turkan.yolcu@ravago.com','$2b$10$ZwzBmPZnCQ0D8tdJETfut.83elT1V8cso4zSEd1scON/r6RWcwXhy','isg_expert',1,'2025-12-01 11:50:09','2025-12-05 11:53:27','[\"146bd77c-ee72-4170-9566-cf29b469ef20\"]','2025-12-05 11:53:27',NULL),
('e5b2c574-8704-4c87-a8d5-32f4aae4dba7','Sefa Uçakkuş','sefa.ucakkus@ravago.com','$2b$10$hN3mX3FYvaUf2FZPUIWLA.nd4T1QVcta6R3yb/qmV0APXjltO8MJO','isg_expert',1,'2025-12-01 11:49:51','2025-12-08 10:05:33','[\"706e609b-c3f5-11f0-91e2-0050568227fa\"]','2025-12-08 10:05:33',NULL),
('fb4deab0-c489-43cb-b888-af6b9e4cd45e','Davut Coşkun','davut.coskun@ravago.com','$2b$10$7tiAF1AS3uEjZf3/OzEtT.PP1Nz7WLQ/.MjoFZMUrbDu6NiT1ibeu','isg_expert',1,'2025-12-15 09:30:10','2026-01-12 13:21:03','[\"f48c1d9d-3a54-4726-b52e-a4f1d85d1043\"]','2026-01-12 13:21:03',NULL),
('fe4acaa9-abe9-43dc-8297-54f61f79e2d6','Gizem Yılmaz','gizem.yilmaz@ravago.com','$2b$10$2xrdzAEnymCMS7CCaX35.OwkUeMz6m8osr1LfGoV/HMcAy8TYIFJe','isg_expert',1,'2025-12-01 11:51:45','2025-12-02 13:04:19','[\"3b4d3240-95ad-4ab8-97d3-179e7c8c7302\"]','2025-12-02 13:04:19',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-12 14:02:37
