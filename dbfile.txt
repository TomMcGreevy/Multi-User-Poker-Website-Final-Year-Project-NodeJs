SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

--
-- Remove existing database, if any, and then create an empty database
--

DROP DATABASE IF EXISTS `pokerdb`;

CREATE DATABASE IF NOT EXISTS pokerdb COLLATE utf8_unicode_ci;

USE pokerdb;

DROP TABLE IF EXISTS `user_data`;
DROP TABLE IF EXISTS `balance_data`;
DROP TABLE IF EXISTS `table_data`;


--
-- Table structure for table `user_data`
--
CREATE TABLE `user_data` (
  `user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_name` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--

--
-- Table structure for table `user_balance`
--
CREATE TABLE `balance_data` (
  `user_id` int(10)  unsigned NOT NULL AUTO_INCREMENT,
  `chips` bigint(15) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES user_data(`user_id`),
  PRIMARY KEY (`user_id`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `table_data`
--
CREATE TABLE `table_data` (
  `table_id` int(10) NOT NULL AUTO_INCREMENT,
  `big_blind` bigint(15) NOT NULL,
  `small_blind` bigint(15) NOT NULL,
  `seats` int(2) NOT NULL,
  `players` int(2) NOT NULL,
  `chips` bigint(15) NOT NULL,
  PRIMARY KEY(`table_id`)
)ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


--
-- Create the user account
--
GRANT ALL PRIVILEGES ON *. * TO 'root'@localhost IDENTIFIED BY 'root';




FLUSH PRIVILEGES;