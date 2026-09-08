-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Gegenereerd op: 08 sep 2026 om 06:24
-- Serverversie: 11.8.8-MariaDB-log
-- PHP-versie: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u477390085_gymcrew`
--

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `founding_athletes`
--

CREATE TABLE `founding_athletes` (
  `id` varchar(64) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `username` varchar(32) NOT NULL,
  `profile_picture_url` varchar(512) DEFAULT NULL,
  `auth_token` varchar(128) NOT NULL,
  `clerk_user_id` varchar(64) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Gegevens worden geëxporteerd voor tabel `founding_athletes`
--

INSERT INTO `founding_athletes` (`id`, `full_name`, `email`, `password_hash`, `username`, `profile_picture_url`, `auth_token`, `clerk_user_id`, `created_at`) VALUES
('athlete-1b4881b0539bed6e', 'Nora Aourzag', 'n.aourzag@gmail.com', '$2y$10$.LyYq3UdQN78AWtyd0mqIuhkwseRu/oYfMgue7YNH66MOdXBvaX7u', 'nora_0416x', NULL, '563ccb733969156e337606a20329cf6e3974c70db19772fa66d420e7e66c2de6', NULL, 1788690777732),
('athlete-30b47135e23fe59e', 'Jaimy mathob', 'jaimy.mathon@gmail.com', '$2y$10$qY/16.l9XCAng3eQhUrywuo78gmsGFQu9QDNbj6r9crJUoKMt9abq', 'mathono', 'https://slateblue-mole-244715.hostingersite.com/api/uploads/athlete-profiles/athlete-30b47135e23fe59e-170b5e271011.png', '33b24cc20a5f58450fdc294236e5346dfa99dfbc194db687278b257e96801337', NULL, 1788373178742),
('athlete-46d606e2b6b70705', 'Senya bossong', 'senyabossong@yahoo.com', '$2y$10$TnKZ1HgivnCOi8Ja7zLv3e6JL2K9TEIoboa/Oj/YMUPa8PwLzI8gy', 'sfitnessx22', NULL, 'ce972a7381259d0d9807f488b73ef94fe80d73771457d3ca85bcd807b988d842', NULL, 1788686682187),
('athlete-50e14c5de65e42ad', 'Emrah Balija', 'emrahbalija@gmail.com', '$2y$10$9cKT20ESREnx9wz.DeAPvex4DCUVCmG6HLbH/LVkyX5tTdipBDS1W', 'embruh', NULL, 'c47dcae7fe13e912921c8138fd970fa290175a6b892ba28d71a08a2ab6cd4602', NULL, 1788800753929),
('athlete-63172ba1b4bf4403', 'Nazar', 'kirigayakadzuto979@gmail.com', '$2y$10$xqkeXccWY8jzns3b15lD6OO3yo2hCAFiI964MC15C4oLaIAYZ.O3u', 'huihui228', 'https://slateblue-mole-244715.hostingersite.com/api/uploads/athlete-profiles/athlete-63172ba1b4bf4403-364179a9d69d.jpg', '956c1e858a00cbb0e2437025821776d1ba7c8e5eef96c5bdfbdef68bd71934c1', NULL, 1788784722795),
('athlete-6354450cc8d796f3', 'Baris', 'bariskiller10@hotmail.com', '$2y$10$BT2lYwJP5exrZ4oevD7nWOGA.y21AhnqDn1dnGeerYKBn3h0Plc8S', 'baris75', NULL, '7866157ad31ddf0b3df424942a49a91b49788fdf808458e70726baa3ad22f104', NULL, 1788809584178),
('athlete-7985dab0e4a0b16a', 'Sofie Montens', 'sofiemontens1@gmail.com', '$2y$10$TGbjf70W.vbCS5.LfzWTCu1LNBVkiEPOH6/ohsHvKehs52bgb.ev2', 'sofie_0416', NULL, '6b1ed9382cc1c612c70b78a306df6942763167366c50f37eb744bc2f1c01f68e', NULL, 1788686684953),
('athlete-7f5a8a4b2ea982ea', 'Soren alenis', 'soren.alenis@outlook.com', '$2y$10$s7IYkiCErjujOjeZSgLvBONz4bBmW1xYhHbR5JlXNtG3TPCkKbc7m', 'gymfons', NULL, '1897ec6571a448553ec8e0a35ee21a9e7b3d61bbe4d16e52cfe845503e52bf84', NULL, 1788847693801),
('athlete-db2bc2aaae381a32', 'Keano De jong', 'keanodj1709@gmail.com', '$2y$10$QsV3mIU9NSXqFHUgZr/Zbe5W6v/djJCChVdL/bB58F37KL25nmskS', 'k_0172', 'https://slateblue-mole-244715.hostingersite.com/api/uploads/athlete-profiles/athlete-db2bc2aaae381a32-352ba515a210.jpg', '64410927835d0d1cea5662024651869b8497904d2deea007a2c0e444a62cecac', NULL, 1788727755304),
('athlete-e1ed8499748fa00c', 'Alessandro Bauweraerts', 'alessandro.bauweraerts@gmail.com', '$2y$10$L.xIRP0h4EH8.AKlNxz4AuU5u18SmF6yUw8T7ePH3Tn0upiSCoQDu', 'trenseii', 'https://slateblue-mole-244715.hostingersite.com/api/uploads/athlete-profiles/athlete-e1ed8499748fa00c-dd70d7e54451.jpg', 'da49d2782f41267e536c7ada7c035eb24eeace2321726266a6845a8f8fce428f', NULL, 1788687304955),
('athlete-f250b0169daa9576', 'test', 'test@gmail.com', '$2y$10$CcYPsm1uX8j0XOv9AocoOOuj8jVVES7CviE3goMutUhoqhpEBazNe', 'mathonowwe', NULL, 'ff47d1f61a7afb61eeb3b9ef31ba025864b2028e2c84ea8c8542c435ca53145b', NULL, 1788406041298),
('athlete-f75e3134859f3987', 'Chloe Mathon', 'cmz.mathon@gmail.com', '$2y$10$Yuz5HNgiKI5t9u3b2vcwS.XiFddGv9FdhOyg7YTTdYyimDwM0Q6gW', 'chloe_0416', 'https://slateblue-mole-244715.hostingersite.com/api/uploads/athlete-profiles/athlete-f75e3134859f3987-07d4d44e1b2c.jpg', 'dfcb87e867ecb04f72194d9a898644536d5c1e31fae865c89598723447c7e560', NULL, 1788686862875),
('athlete-fed47004d431aedf', 'test', 'tes1t@gmail.com', '$2y$10$1pboUWOgz3BziSvn5gYFNOHaoq3LkxEoUhWf.znh73fit77pnWyLm', 'username', NULL, 'bd127c7a64a0649cbd9ea365ca0ad5260280fe44a325fd5a497fcc7d3e76edfd', NULL, 1788409016060);

--
-- Indexen voor geëxporteerde tabellen
--

--
-- Indexen voor tabel `founding_athletes`
--
ALTER TABLE `founding_athletes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_foundingathletes_email` (`email`),
  ADD UNIQUE KEY `uniq_foundingathletes_username` (`username`),
  ADD UNIQUE KEY `uniq_foundingathletes_token` (`auth_token`),
  ADD UNIQUE KEY `uniq_foundingathletes_clerk_user` (`clerk_user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
