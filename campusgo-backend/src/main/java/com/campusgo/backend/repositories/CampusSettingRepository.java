package com.campusgo.backend.repositories;

import com.campusgo.backend.models.CampusSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CampusSettingRepository extends JpaRepository<CampusSetting, Long> {
    Optional<CampusSetting> findBySettingKey(String settingKey);
}
